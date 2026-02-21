import * as XLSX from "xlsx";

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
function readFile<T>(file: File, readMethod: 'readAsText' | 'readAsArrayBuffer'): Promise<T> {
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
  return readFile<ArrayBuffer>(file, 'readAsArrayBuffer');
}

/**
 * Helper function to read file as text
 * @param file - File to read
 * @returns Promise resolving to text string
 */
export function readFileAsText(file: File): Promise<string> {
  return readFile<string>(file, 'readAsText');
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
        `Excel file contains ${workbook.SheetNames.length} sheets. Using first sheet: "${workbook.SheetNames[0]}"`
      );
    }

    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to CSV
    // Options: strip: true removes trailing commas, blankrows: false removes empty rows
    const csv = XLSX.utils.sheet_to_csv(worksheet, {
      strip: true,
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
      throw new Error(`The Excel file appears to be corrupted or invalid: ${error.message}`);
    }
    throw new Error("The Excel file appears to be corrupted or invalid");
  }
}
