/** 读取 SVG image 的引用地址。 */
export function resolvePrintSvgImageHref(imageElement: Element) {
  return imageElement.getAttribute('href') || ''
}

function resolvePrintSvgDomImageSrc(image: HTMLImageElement) {
  return image.currentSrc || image.src
}

function preloadPrintSvgImage(doc: Document, href: string) {
  const contentWindow = doc.defaultView
  if (!href || !contentWindow) {
    return Promise.resolve()
  }
  return new Promise<void>(resolve => {
    const image = new contentWindow.Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = href
  })
}

function resolvePrintSvgFontReady(doc: Document) {
  return doc.fonts?.ready || Promise.resolve()
}

/** 等待打印 iframe 内 SVG 图片和字体就绪，减少打印首帧丢图或字体回退。 */
export function waitPrintSvgResources(doc: Document, timeout = 3000) {
  const hrefList = Array.from(doc.querySelectorAll('svg image'))
    .map(resolvePrintSvgImageHref)
    .filter(Boolean)
  const imageHrefSet = new Set([
    ...hrefList,
    ...Array.from(doc.images).map(resolvePrintSvgDomImageSrc)
  ])
  const resourcesReady = Promise.all([
    resolvePrintSvgFontReady(doc).catch(() => undefined),
    ...Array.from(imageHrefSet).map(href => preloadPrintSvgImage(doc, href))
  ]).then(() => undefined)
  const timeoutReady = new Promise<void>(resolve => {
    setTimeout(resolve, timeout)
  })
  return Promise.race([resourcesReady, timeoutReady])
}
