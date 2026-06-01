import * as XLSX from "xlsx";

export interface TextFileReadResult {
  text: string;
  encoding: string;
  source: "bom" | "mime" | "heuristic" | "default";
}

/**
 * Check if a file is an Excel file based on its name
 */
export function isExcelFile(filename: string): boolean {
  const excelExtensions = [".xlsx", ".xls"];
  const lowerFilename = filename.toLowerCase();
  return excelExtensions.some((ext) => lowerFilename.endsWith(ext));
}

/**
 * Generic helper to read a file using FileReader
 * @param file - File to read
 * @param readMethod - Method to call on FileReader (e.g., 'readAsText', 'readAsArrayBuffer')
 * @returns Promise resolving to the file content
 */
function readFile<T>(
  file: File,
  readMethod: "readAsText" | "readAsArrayBuffer",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(data as T);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onabort = () => reject(new Error("File reading was aborted"));
    reader[readMethod](file);
  });
}

/**
 * Helper function to read file as ArrayBuffer
 * @param file - File to read
 * @returns Promise resolving to ArrayBuffer
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return readFile<ArrayBuffer>(file, "readAsArrayBuffer");
}

/**
 * Detect text encoding from file bytes or MIME metadata.
 */
export async function readFileAsText(file: File): Promise<TextFileReadResult> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(arrayBuffer);

  if (bytes.length === 0) {
    throw new Error(`${file.name} is empty.`);
  }

  const bomEncoding = detectBomEncoding(bytes);
  const mimeEncoding = bomEncoding ? null : detectMimeEncoding(file.type);

  let encoding: string;
  let source: TextFileReadResult["source"];
  let decodedText: string | null = null;

  if (bomEncoding || mimeEncoding) {
    encoding = (bomEncoding || mimeEncoding)!;
    source = bomEncoding ? "bom" : "mime";
  } else {
    const utf8Result = tryDecodeUtf8(bytes);
    if (utf8Result.ok) {
      encoding = "utf-8";
      source = "heuristic";
      decodedText = utf8Result.text!;
    } else {
      encoding = "windows-1252";
      source = "heuristic";
    }
  }

  try {
    const text =
      decodedText !== null
        ? decodedText
        : new TextDecoder(encoding).decode(bytes);
    return { text, encoding, source };
  } catch {
    const text = new TextDecoder("utf-8").decode(bytes);
    return { text, encoding: "utf-8", source: "default" };
  }
}

function tryDecodeUtf8(bytes: Uint8Array): { ok: boolean; text?: string } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}

function detectBomEncoding(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return "utf-8";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return "utf-16le";
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }
  return null;
}

function detectMimeEncoding(mimeType: string): string | null {
  const match = RegExp(/charset=([^;]+)/i).exec(mimeType);
  if (!match) {
    return null;
  }

  return normaliseEncodingLabel(match[1]);
}

function normaliseEncodingLabel(label: string): string {
  const normalisedLabel = label.trim().toLowerCase();

  switch (normalisedLabel) {
    case "utf8":
      return "utf-8";
    case "utf16":
    case "utf-16":
    case "utf16le":
      return "utf-16le";
    case "utf16be":
      return "utf-16be";
    default:
      return normalisedLabel;
  }
}

/**
 * Read an Excel file and convert it to CSV string format
 * @param file - The Excel file to read
 * @returns Promise resolving to CSV string
 * @throws Error if file is corrupt, empty, or cannot be parsed
 */
export async function readExcelFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("The Excel file contains no data");
    }

    // Warn if multiple sheets exist
    if (workbook.SheetNames.length > 1) {
      console.warn(
        `Excel file contains ${workbook.SheetNames.length} sheets. Using first sheet: "${workbook.SheetNames[0]}"`,
      );
    }

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to CSV
    // Options: strip: false preserves trailing empty columns, blankrows: false removes empty rows
    const csv = XLSX.utils.sheet_to_csv(worksheet, {
      strip: false,
      blankrows: false,
    });

    // Check if CSV is empty
    if (!csv || csv.trim().length === 0) {
      throw new Error("The Excel file contains no data");
    }

    return csv;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw if already a good error message
      if (error.message.includes("Excel file")) {
        throw error;
      }
      throw new Error(
        `The Excel file appears to be corrupted or invalid: ${error.message}`,
      );
    }
    throw new Error("The Excel file appears to be corrupted or invalid");
  }
}

/**
 * Truncate a filename to 60 characters by replacing the middle with "..."
 * @param filename - The filename to truncate
 * @returns The truncated filename (max 60 characters)
 */
export function truncateFileName(filename: string): string {
  if (filename.length <= 60) {
    return filename;
  }
  const start = filename.substring(0, 28);
  const end = filename.substring(filename.length - 29);
  return `${start}...${end}`;
}
