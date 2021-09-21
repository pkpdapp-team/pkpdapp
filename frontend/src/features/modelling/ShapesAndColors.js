import ColorScheme from 'color-scheme'

var scheme = new ColorScheme();
scheme.from_hue(21)         
      .scheme('tetrade')   
      .variation('hard');

const colors = scheme.colors().map(hexToRGB);

const shapes = [
    'cross',
    'triangle',
    'star',
    'crossRot',
    'dash',
    'line',
    'rect',
    'rectRounded',
    'rectRot',
    'circle'
  ]

export function getShape(i) {
  const index = i % shapes.length
  return shapes[index]
}

export function getColor(i) {
  const index = i % colors.length
  return colors[index]
}


// https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
function hexToRGB(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}


