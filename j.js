// By + Copyright Greg Abbott 2024-2025. V 2025_0227
document.addEventListener("DOMContentLoaded", () => {
const el = {}
const get_by_id=x=>document.getElementById(x)
let els_to_get=[
  //choose image section 
  `default_image_area`,
    `trigger_image_input_picker`,
    `image_picker`,
    `preview_default_img`,
  `custom_image_area`,
    `remove_chosen_image`,
    `preview_user_picked_img`,
  //choose zip section
    `default_zip_area`,
      `trigger_zip_picker`,
      `zip_picker`,
      `custom_text_message`,
    `custom_zip_area`,
      `remove_chosen_zip`,
      `chosen_zip_name`,
  //finish section
  `output_file_name`,
  `save_button`,
  //instructions section (update to reflect user data)
  `current_img_ext`,
]
els_to_get.forEach(id=>{
  el[id]=get_by_id(id)
})
el.trigger_zip_picker.onclick=()=>el.zip_picker.click()
el.trigger_image_input_picker.onclick=()=>el.image_picker.click()
let output_name_placeholders= [...document.getElementsByClassName(`output_name_sync`)]
function update_dom_references_to_current_output_name(){
  output_name_placeholders.forEach(l=>l.innerText=el.output_file_name.value)
}
el.output_file_name.onkeyup=update_dom_references_to_current_output_name
update_dom_references_to_current_output_name()
let save_button_initial_text=el.save_button.textContent
//in case user has no image, provide a default
let png_as_b64={}
png_as_b64.smiley_face=`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAAAAAA6mKC9AAAAMElEQVR42mP4jwYYcAgwAAGSAAMyiayNAYYRCIPCJQABOFVAMZjAsBbdYdidTtC3ADUQ1Sug+UV6AAAAAElFTkSuQmCC`
png_as_b64.smiley_transparent_16=`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAACVBMVEVHcEz///8AAADmzmMiAAAAAXRSTlMAQObYZgAAAENJREFUeJxNjLENgDAMwCw2DsnCP4kSJpb8wRM5AYkzq7aq1MWTbbh+OMpeTtUHUXUk0qlI21G2kGHI/fmURzYGfdUAZ4AV+rx9Sv0AAAAASUVORK5CYII=`
let chosen_default_png=png_as_b64.smiley_transparent_16
el.preview_default_img.src=chosen_default_png
let gl0={}//any 'globals'
gl0.default_img_as_array_buffer = null //filled only on demand, then stored in case user makes multiple zips with this default image
gl0.given_image_file=null
function show_el(el){el.classList.remove('hide')}
function hide_el(el){el.classList.add('hide')}
el.remove_chosen_image.onclick=remove_image
function remove_image(){
  //remove the custom image
  el.image_picker.value = ''
  gl0.given_image_file=null
  hide_el(el.custom_image_area)
  //reset to default
  show_el(el.default_image_area)
  el.current_img_ext.innerText='png'
}
function base64ToArrayBuffer(base64) {
  //console.log({base64})
  const binaryString = window.atob(base64)//decode to binary
  // make new ArrayBuffer with length of binary_string
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  // Fill bytes with binary_string's character codes
  let i =0
  for (;i<len;i++)bytes[i] = binaryString.charCodeAt(i)
  return bytes.buffer
}
el.save_button.addEventListener("click", handle_save)
const array_buffer_to_img_src = array_buffer => {
  const blob = new Blob([array_buffer])
  return URL.createObjectURL(blob)
}
function concat_uint8_arrays(uint8Arrays) {
  const totalLength = uint8Arrays.reduce((a,l)=>a+l.length, 0)
  const resultBuffer = new ArrayBuffer(totalLength)
  const resultArray = new Uint8Array(resultBuffer)
  let offset = 0
  for (const arr of uint8Arrays) {
      resultArray.set(arr, offset)
      offset += arr.length
  }
  return resultBuffer
}
el.zip_picker.addEventListener('change',()=>{
  let file = el.zip_picker.files[0]
  if(!file){
    remove_chosen_zip()
    return
  }
  el.chosen_zip_name.innerText=file.name
  show_el(el.custom_zip_area)
  hide_el(el.default_zip_area)
})
function remove_chosen_zip(){
  el.zip_picker.value=''
  hide_el(el.custom_zip_area)
  show_el(el.default_zip_area)
}
el.remove_chosen_zip.onclick=remove_chosen_zip
el.image_picker.addEventListener('change',async ()=>{
  let file=el.image_picker.files[0]
  if (!file) {
    remove_image()
    return
  }
  gl0.given_image_file = await read_file_as_array_buffer(file)
  //Display
  el.preview_user_picked_img.src=
    array_buffer_to_img_src(gl0.given_image_file)
  el.current_img_ext.innerText=
    file.type
    .toLowerCase()
    .replace('image/','')
    .replace('jpeg','jpg')
  hide_el(el.default_image_area)
  show_el(el.custom_image_area)
})
async function handle_save() {
  try {
    let zip_data
    if(!el.zip_picker.files[0]){
      //Custom Zip
      var the_zip
      the_zip=new_zip({})
      the_zip.add_text_file({
          //path:'',
          name:
            //el.output_file_name.value,
            'message',
          ext:'md',
          content: el.custom_text_message.value,
          date:'2001-01-01T01:00:00'
        })
      zip_data= concat_uint8_arrays(the_zip.get())
    }
    else{
      zip_data=await read_file_as_array_buffer(el.zip_picker.files[0])
    }
    el.save_button.disabled = true
    el.save_button.textContent = "Processing..."
    let image_data
    let image_array
    if(gl0.given_image_file)image_data=gl0.given_image_file
    else {
      //use default image
      if(gl0.default_img_as_array_buffer===null){
        //only generate when needed,
        //then store for re-use, in case user may want different zips with the same image
        gl0.default_img_as_array_buffer=
        base64ToArrayBuffer(chosen_default_png.split(',')[1])
      }
      image_data=gl0.default_img_as_array_buffer
    }
    image_array = new Uint8Array(image_data)
    const file_type = detect_file_type(image_array)
    /*console.table({
      "Detected file type": file_type,
      //"Image size": image_data.byteLength,
      //"ZIP size": zip_data.byteLength
    })*/
    const polyglot = await create_polyglot(
      image_data,
      zip_data,
      file_type
    )
    // Use file extension of original image file type for output
    const extension = file_type === "PNG" ? ".png" : ".jpg"
    const fileName = (el.output_file_name.value || "output") + extension
    await save_file(polyglot, fileName)
  } catch (error) {
    console.error("Error:", error)
    alert("An error occurred while processing the files.\n(See the console)")
  } finally {
    el.save_button.disabled = false
    el.save_button.textContent = save_button_initial_text
  }
}
function detect_file_type(list) {
  const is_png = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]
    .every((byte, i) => list[i] === byte)
  if (is_png) return "PNG"
  const is_jpg=list[0]===0xff&&list[1]===0xd8&&list[2]===0xff
  if (is_jpg) return "JPEG"
  throw new Error(
    "Unsupported image format. Please use PNG or JPEG."
  )
}
async function create_polyglot(
  image_data,
  zip_data,
  file_type
) {
  const image_array = new Uint8Array(image_data)
  const zipArray = new Uint8Array(zip_data)
  // Verify ZIP signature
  const zipSignature = [0x50, 0x4b, 0x03, 0x04]
  if (!zipSignature.every((byte,i)=>zipArray[i]===byte)){
    throw new Error("Invalid ZIP file format")
  }
  if (file_type === "PNG") {
    return create_png_polyglot(image_array, zipArray)
  }
  else {
    return create_jpeg_polyglot(image_array, zipArray)
  }
}
async function create_png_polyglot(pngArray, zipArray) {
  // Verify PNG signature
  let png_signature=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]
  if (!png_signature.every((byte,i)=>pngArray[i]===byte)){
    throw new Error("Invalid PNG file format")
  }
  // Find end of PNG data
  let pos = 8 // Skip PNG signature
  let validPngEnd = false
  while (pos < pngArray.length - 12) {
    const length =
      (pngArray[pos] << 24) |
      (pngArray[pos + 1] << 16) |
      (pngArray[pos + 2] << 8) |
      pngArray[pos + 3]
    const type = String.fromCharCode(
      pngArray[pos + 4],
      pngArray[pos + 5],
      pngArray[pos + 6],
      pngArray[pos + 7]
    )
    if (type === "IEND") {
      pos += 12 + length
      validPngEnd = true
      break
    }
    pos += 12 + length
  }
  if (!validPngEnd) {//add one
    console.log("Adding IEND chunk")
    const iend_chunk = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x00, // Length
      0x49,
      0x45,
      0x4e,
      0x44, // "IEND"
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ])
    const temp_array = new Uint8Array(pos + iend_chunk.length)
    temp_array.set(pngArray.slice(0, pos))
    temp_array.set(iend_chunk, pos)
    pos += iend_chunk.length
  }
  // Find ZIP end of central directory
  let end_of_central_directory = -1
  for (let i = zipArray.length - 22; i >= 0; i--) {
    if (
      zipArray[i] === 0x50 &&
      zipArray[i + 1] === 0x4b &&
      zipArray[i + 2] === 0x05 &&
      zipArray[i + 3] === 0x06
    ) {
      end_of_central_directory = i
      break
    }
  }
  if (end_of_central_directory === -1) {
    throw new Error(
      "Invalid ZIP structure: End of central directory not found"
    )
  }
  // Make the final combined buffer
  const combined = new Uint8Array(pos + zipArray.length)
  /* PNG data*/  combined.set(pngArray.slice(0, pos))
  /* ZIP data*/  combined.set(zipArray, pos)
  // Update ZIP offsets
  const view = new DataView(combined.buffer)
  let offset = pos
  // Find and update all central directory entries
  let i = pos
  for (; i < combined.length - 4; i++) {
    if (
      combined[i] === 0x50 &&
      combined[i + 1] === 0x4b &&
      combined[i + 2] === 0x01 &&
      combined[i + 3] === 0x02
    ) {
      // Update relative offset of local header
      const old_offset = view.getUint32(i + 42, true)
      view.setUint32(i + 42, old_offset + offset, true)
    }
  }
  // Update end of central directory offset
  if (end_of_central_directory !== -1) {
    const old_offset = view.getUint32(pos + end_of_central_directory + 16, true)
    view.setUint32(pos + end_of_central_directory + 16, old_offset + offset, true)
  }
  return combined
}
async function create_jpeg_polyglot(jpegArray, zipArray) {
  // Find the JPEG EOF marker (0xFF 0xD9)
  let jpegEnd = -1
  for (let i = jpegArray.length - 2; i >= 0; i--) {
    if (jpegArray[i] === 0xff && jpegArray[i + 1] === 0xd9) {
      jpegEnd = i + 2
      break
    }
  }
  if (jpegEnd === -1) {
    throw new Error("Invalid JPEG: EOF marker not found")
  }
  const combined = new Uint8Array(jpegEnd + zipArray.length)
  /* Copy JPEG data*/  combined.set(jpegArray.slice(0, jpegEnd))
  /* Copy ZIP data*/  combined.set(zipArray, jpegEnd)
  // Update ZIP offsets
  const view = new DataView(combined.buffer)
  let offset = jpegEnd
  // Find and update all central directory entries
  for (let i = offset; i < combined.length - 4; i++) {
    if (
      combined[i] === 0x50 &&
      combined[i + 1] === 0x4b &&
      combined[i + 2] === 0x01 &&
      combined[i + 3] === 0x02
    ) {
      // Update relative offset of local header
      const old_offset = view.getUint32(i + 42, true)
      view.setUint32(i + 42, old_offset + offset, true)
    }
  }
  // Find and update end of central directory
  for (let i = combined.length - 22; i >= 0; i--) {
    if (
      combined[i] === 0x50 &&
      combined[i + 1] === 0x4b &&
      combined[i + 2] === 0x05 &&
      combined[i + 3] === 0x06
    ) {
      const old_offset = view.getUint32(i + 16, true)
      view.setUint32(i + 16, old_offset + offset, true)
      break
    }
  }
  return combined
}
function read_file_as_array_buffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror=()=>reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}
function save_file(data, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [data],
        { type: "application/octet-stream" }
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => {
        URL.revokeObjectURL(url)
        resolve()
      }, 100)
    } catch (error) {
      reject(new Error("Failed to save file: " + error.message))
    }
  })
}
})