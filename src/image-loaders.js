// Unified photo / radiograph loaders for import surfaces.
//
// Handles the non-browser-native formats dentists actually receive:
//   • HEIC/HEIF — iPhone clinic photos. Chrome and Firefox won't decode
//     these natively; Safari will. We transcode to JPEG via heic2any so
//     every downstream consumer sees a standard browser-decodable blob.
//   • DICOM (.dcm) — CBCT slices / digital radiographs from sensors like
//     Dexis, Carestream, Schick. Decoded via daikon into a canvas, then
//     exported as PNG so the viewer can treat it like any other image.
//
// Returns a Promise<{ dataURL, mimeType, width, height, originalName }>
// so the caller can drop the result into <img src={dataURL}> or feed
// imageBase64 to /api/analyze-radiograph.

import daikon from 'daikon'
import heic2any from 'heic2any'

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function transcodeHeic(file) {
  // heic2any handles both .heic and .heif — returns a Blob. We target JPEG
  // at 0.92 quality — virtually lossless for photo review and keeps file
  // size reasonable for the Anthropic API upload path.
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const jpegBlob = Array.isArray(result) ? result[0] : result
  const dataURL = await blobToDataURL(jpegBlob)
  // read back dimensions
  const dims = await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = dataURL
  })
  return { dataURL, mimeType: 'image/jpeg', width: dims.w, height: dims.h, originalName: file.name }
}

async function transcodeDicom(file) {
  const buf = await file.arrayBuffer()
  // daikon expects a DataView pointed at the DICOM dataset.
  const image = daikon.Series.parseImage(new DataView(buf))
  if (!image) throw new Error('DICOM parse failed — file may be malformed or not a single-frame image')
  const width = image.getCols()
  const height = image.getRows()
  if (!width || !height) throw new Error('DICOM has no pixel dimensions')

  // getInterpretedData returns scaled display values (applies RescaleSlope/
  // Intercept + Window/Level defaults embedded in the dataset). Prefer that
  // over raw pixels because raw pixels often look black-and-white-washed
  // without applying the DICOM VOI transforms.
  const pixels = image.getInterpretedData(false, true)
  if (!pixels) throw new Error('DICOM contains no displayable pixel data')

  // Auto-contrast: normalise the interpreted range to 0–255 for PNG output.
  let min = Infinity, max = -Infinity
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] < min) min = pixels[i]
    if (pixels[i] > max) max = pixels[i]
  }
  const range = (max - min) || 1

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(width, height)
  for (let i = 0, p = 0; i < pixels.length; i++, p += 4) {
    const v = Math.round(((pixels[i] - min) / range) * 255)
    imgData.data[p] = v
    imgData.data[p + 1] = v
    imgData.data[p + 2] = v
    imgData.data[p + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)
  const dataURL = canvas.toDataURL('image/png')
  return { dataURL, mimeType: 'image/png', width, height, originalName: file.name }
}

// Public entry point — sniff by extension. Returns a normalised record even
// for plain browser-native formats (JPG/PNG/WebP) so callers don't have to
// branch on the format.
export async function loadImageFromFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()

  if (ext === 'heic' || ext === 'heif') {
    return await transcodeHeic(file)
  }

  if (ext === 'dcm' || ext === 'dicom') {
    return await transcodeDicom(file)
  }

  // Native: read the file as a data URL and measure it.
  const dataURL = await blobToDataURL(file)
  const dims = await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = dataURL
  })
  return { dataURL, mimeType: file.type || `image/${ext}`, width: dims.w, height: dims.h, originalName: file.name }
}
