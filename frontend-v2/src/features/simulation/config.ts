import Plotly from "plotly.js-basic-dist-min";
import { Config, PlotlyHTMLElement, Icon as PlotlyIcon } from "plotly.js";

type ConfigProps = {
  remove: (index: number) => void;
  setOpen: (open: boolean) => void;
  index: number;
};
export function useConfig({
  remove,
  setOpen,
  index,
}: ConfigProps): Partial<Config> {
  const handleCustomisePlot = () => {
    setOpen(true);
  };

  const handleRemovePlot = () => {
    if (window.confirm("Are you sure you want to delete this plot?")) {
      remove(index);
    }
  };

  const handleCopyToClipboard = (gd: PlotlyHTMLElement) => {
    Plotly.toImage(gd, { format: "png", width: 1000, height: 600 }).then(
      async (url: string) => {
        try {
          const data = await fetch(url);
          const blob = await data.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          console.log("Image copied.");
        } catch (err: any) {
          console.error(err.name, err.message);
        }
      },
    );
  };

  const editIcon: PlotlyIcon = {
    width: 500,
    height: 600,
    path: "m70.064 422.35 374.27-374.26 107.58 107.58-374.26 374.27-129.56 21.97z m70.569 417.81 110.61 110.61 z m491.47 108.37-366.69 366.68 z m54.222 507.26 40.975 39.546 z",
  };
  const removeIcon: PlotlyIcon = {
    width: 500,
    height: 600,
    path: "M507.4,411.5L507.4,411.5L351.9,256l155.5-155.5l3.7-5.6c1.9-5.6,0.9-12.1-3.7-16.8L433.8,4.6 C429.2,0,422.7-1,417.1,0.9l-5.6,3.7L256,160.1L100.5,4.6l-5.6-3.7C89.3-1,82.8,0,78.2,4.6L4.6,78.2C0,82.8-1,89.3,0.9,94.9 l3.7,5.6L160.1,256L4.6,411.5l-3.7,5.6c-1.9,5.6-0.9,12.1,3.7,16.8l73.6,73.6c4.7,4.7,11.2,5.6,16.8,3.7l5.6-3.7L256,351.9 l155.5,155.5l5.6,3.7c5.6,1.9,12.1,0.9,16.8-3.7l73.6-73.6c4.7-4.7,5.6-11.2,3.7-16.8L507.4,411.5z",
  };
  const copyIcon: PlotlyIcon = {
    width: 300,
    height: 600,
    path: "M102.17,29.66A3,3,0,0,0,100,26.79L73.62,1.1A3,3,0,0,0,71.31,0h-46a5.36,5.36,0,0,0-5.36,5.36V20.41H5.36A5.36,5.36,0,0,0,0,25.77v91.75a5.36,5.36,0,0,0,5.36,5.36H76.9a5.36,5.36,0,0,0,5.33-5.36v-15H96.82a5.36,5.36,0,0,0,5.33-5.36q0-33.73,0-67.45ZM25.91,20.41V6h42.4V30.24a3,3,0,0,0,3,3H96.18q0,31.62,0,63.24h-14l0-46.42a3,3,0,0,0-2.17-2.87L53.69,21.51a2.93,2.93,0,0,0-2.3-1.1ZM54.37,30.89,72.28,47.67H54.37V30.89ZM6,116.89V26.37h42.4V50.65a3,3,0,0,0,3,3H76.26q0,31.64,0,63.24ZM17.33,69.68a2.12,2.12,0,0,1,1.59-.74H54.07a2.14,2.14,0,0,1,1.6.73,2.54,2.54,0,0,1,.63,1.7,2.57,2.57,0,0,1-.64,1.7,2.16,2.16,0,0,1-1.59.74H18.92a2.15,2.15,0,0,1-1.6-.73,2.59,2.59,0,0,1,0-3.4Zm0,28.94a2.1,2.1,0,0,1,1.58-.74H63.87a2.12,2.12,0,0,1,1.59.74,2.57,2.57,0,0,1,.64,1.7,2.54,2.54,0,0,1-.63,1.7,2.14,2.14,0,0,1-1.6.73H18.94a2.13,2.13,0,0,1-1.59-.73,2.56,2.56,0,0,1,0-3.4ZM63.87,83.41a2.12,2.12,0,0,1,1.59.74,2.59,2.59,0,0,1,0,3.4,2.13,2.13,0,0,1-1.6.72H18.94a2.12,2.12,0,0,1-1.59-.72,2.55,2.55,0,0,1-.64-1.71,2.5,2.5,0,0,1,.65-1.69,2.1,2.1,0,0,1,1.58-.74ZM17.33,55.2a2.15,2.15,0,0,1,1.59-.73H39.71a2.13,2.13,0,0,1,1.6.72,2.61,2.61,0,0,1,0,3.41,2.15,2.15,0,0,1-1.59.73H18.92a2.14,2.14,0,0,1-1.6-.72,2.61,2.61,0,0,1,0-3.41Zm0-14.47A2.13,2.13,0,0,1,18.94,40H30.37a2.12,2.12,0,0,1,1.59.72,2.61,2.61,0,0,1,0,3.41,2.13,2.13,0,0,1-1.58.73H18.94a2.16,2.16,0,0,1-1.59-.72,2.57,2.57,0,0,1-.64-1.71,2.54,2.54,0,0,1,.65-1.7ZM74.3,10.48,92.21,27.26H74.3V10.48Z",
    transform: "scale(4.5)",
  };

  const config: Partial<Config> = {
    modeBarButtonsToAdd: [
      {
        name: "Copy to Clipboard",
        title: "Copy to Clipboard",
        click: handleCopyToClipboard,
        icon: copyIcon,
      },
      {
        name: "Customise Plot",
        title: "Customise Plot",
        click: handleCustomisePlot,
        icon: editIcon,
      },
      {
        name: "Remove Plot",
        title: "Remove Plot",
        click: handleRemovePlot,
        icon: removeIcon,
      },
    ],
    displaylogo: false,
    scrollZoom: true,
  };

  return config;
}
