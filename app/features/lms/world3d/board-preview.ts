/** Fit a complete PDF page inside the board, preserving its aspect ratio. */
export function boardPreviewScale(boardWidth: number, boardHeight: number, pageWidth: number, pageHeight: number) {
  return Math.min((boardWidth * 0.9) / pageWidth, (boardHeight * 0.86) / pageHeight);
}
