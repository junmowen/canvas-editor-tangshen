Local demo PDF fonts

The demo PDF export reads local TTF files from this directory so jsPDF can
embed Unicode text with stable regular/bold weights.

Run `npm run demo:pdf-fonts` on Windows to extract local Microsoft YaHei TTC
faces into TTF files for manual browser testing.

Generated font files are ignored by git. Production integrations should pass
their own licensed TTF files through `command.getPdfBlob({ fonts })`.
