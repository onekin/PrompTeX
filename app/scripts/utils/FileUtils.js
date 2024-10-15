class FileUtils {
  static readTextFile (file, callback) {
    try {
      let reader = new window.FileReader()
      // Closure to capture the file information.
      reader.onload = (e) => {
        if (e && e.target && e.target.result) {
          callback(null, e.target.result)
        }
      }
      reader.readAsText(file)
    } catch (e) {
      callback(e)
    }
  }

  static checkPackagesInOverleaf (document) {
    const xcolorPackage = '\\usepackage{xcolor}'
    const todonotesPackage = '\\usepackage{todonotes}'

    let needsXColor = !document.includes(xcolorPackage)
    let needsTodoNotes = !document.includes(todonotesPackage)

    // Step 3: If the packages are missing, add them at the beginning of the document
    if (needsXColor || needsTodoNotes) {
      let packageInsert = ''

      if (needsXColor) {
        packageInsert += `${xcolorPackage}\n`
      }

      if (needsTodoNotes) {
        packageInsert += `${todonotesPackage}\n`
      }

      // Add the missing packages at the beginning of the LaTeX document
      return packageInsert + document
    }
  }

  static readJSONFile (file, callback) {
    FileUtils.readTextFile(file, (err, text) => {
      if (err) {
        callback(err)
      } else {
        try {
          let json = JSON.parse(text)
          callback(null, json)
        } catch (err) {
          callback(err)
        }
      }
    })
  }
}

module.exports = FileUtils
