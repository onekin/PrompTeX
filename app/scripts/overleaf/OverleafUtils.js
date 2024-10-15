const _ = require('lodash')

class OverleafUtils {
  static async getAllEditorContent () {
    let onTop = false
    const editorContainer = document.querySelector('.cm-scroller')
    const contentEditable = document.querySelector('.cm-content')
    const lineNumbersContainer = document.querySelector('.cm-lineNumbers')
    let contentLines = []
    let capturedLineNumbers = new Set()

    if (!editorContainer || !contentEditable || !lineNumbersContainer) {
      console.error('Editor elements not found')
      return
    }

    function scrollEditor (position) {
      return new Promise((resolve) => {
        editorContainer.scrollTo({ top: position })
        setTimeout(resolve, 100)
      })
    }

    function extractVisibleText () {
      const lineNumbers = Array.from(lineNumbersContainer.querySelectorAll('.cm-gutterElement')).slice(1)
      let lines = contentEditable.querySelectorAll('.cm-line, .cm-gap')

      let myText = Array.from(lines).map((line) => {
        let lineText = ''
        if (line.classList.contains('cm-line')) {
          line.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              lineText += node.textContent || ''
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
              lineText += node.innerText || ''
            }
          })
          return lineText.trim()
        } else if (line.classList.contains('cm-gap')) {
          return ''
        }
      })

      let myLineNumbers = lineNumbers.map((item) => item.textContent)

      if (myLineNumbers.length > 0 && myLineNumbers[0] === '1') {
        onTop = true
      }
      if (onTop) {
        if (myLineNumbers[0] !== '1') {
          // check from already saved content the first five myLineNumbers and myText correspond;
          let isAligned = false
          const maxCheckLength = 5 // Let's check the first five lines for alignment
          let offset = 0
          // Compare saved content to find where the mismatch happens
          while (!isAligned && offset < maxCheckLength) {
            isAligned = true // Assume alignment is correct at the start

            // Check the first few stored line numbers and text to ensure alignment
            for (let i = 0; i < Math.min(myText.length, maxCheckLength); i++) {
              const savedContentLine = contentLines.find(line => line.startsWith(`${myLineNumbers[i]}:`))
              const currentLine = `${myLineNumbers[i]}: ${myText[i] || '\n'}` // Create new line to compare (with line number)

              // If there's a mismatch between stored and new line number:text, it's not aligned
              if (savedContentLine && savedContentLine !== currentLine) {
                isAligned = false // If any mismatch is found, set to false
                break
              }
            }

            // If not aligned, remove the first element of myText (shift) and increment the offset
            if (!isAligned) {
              myText = myText.slice(1) // Remove the first element of the text
              offset++ // Move forward to recheck
            }
          }
        }
        // Ensure the text length matches the line numbers length if more lines are added
        if (myText.length > myLineNumbers.length) {
          myText = myText.slice(0, myLineNumbers.length)
        }
        // Loop over the line numbers and match with the text content
        myLineNumbers.forEach((lineNumber, index) => {
          const text = myText[index] // Get the corresponding text for this line number
          if (lineNumber && !capturedLineNumbers.has(lineNumber)) {
            if (text) {
              contentLines.push(`${lineNumber}: ${text}`) // Add the line number and the corresponding text
            } else {
              contentLines.push(`${lineNumber}: \n`) // Handle the empty text case
            }
            capturedLineNumbers.add(lineNumber) // Mark the line number as captured
          }
        })
      }
    }

    let position = 0
    while (position < editorContainer.scrollHeight) {
      extractVisibleText()
      await scrollEditor(position)
      position = editorContainer.scrollTop + editorContainer.clientHeight
      if (Math.ceil(position) + 1 >= editorContainer.scrollHeight) {
        break
      }
    }
    let fullText = contentLines.join('\n')
    console.log('Full text:', fullText)
    fullText = contentLines
      .map(line => line.replace(/^\d+:\s*/, '')) // Remove the leading '{number}: ' pattern
      .join('\n')
    return fullText
  }

  static async scrollToContent (name, navigation) {
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }
    let textToFind = `\\promptex{\\textit{${name}`
    let onTop = false
    let navigationIndex = 0
    const editorContainer = document.querySelector('.cm-scroller')
    const contentEditable = document.querySelector('.cm-content')
    const lineNumbersContainer = document.querySelector('.cm-lineNumbers')
    let contentLines = []
    let capturedLineNumbers = new Set()

    if (!editorContainer || !contentEditable || !lineNumbersContainer) {
      console.error('Editor elements not found')
      return
    }

    function scrollEditor (position) {
      return new Promise((resolve) => {
        editorContainer.scrollTo({ top: position })
        setTimeout(resolve, 100)
      })
    }

    function extractVisibleText () {
      const lineNumbers = Array.from(lineNumbersContainer.querySelectorAll('.cm-gutterElement')).slice(1)
      let lines = contentEditable.querySelectorAll('.cm-line, .cm-gap')

      let myText = Array.from(lines).map((line) => {
        let lineText = ''
        if (line.classList.contains('cm-line')) {
          line.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              lineText += node.textContent || ''
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
              lineText += node.innerText || ''
            }
          })
          return lineText.trim()
        } else if (line.classList.contains('cm-gap')) {
          return ''
        }
      })

      let myLineNumbers = lineNumbers.map((item) => item.textContent)

      if (myLineNumbers.length > 0 && myLineNumbers[0] === '1') {
        onTop = true
      }
      if (onTop) {
        if (myLineNumbers[0] !== '1') {
          // check from already saved content the first five myLineNumbers and myText correspond;
          let isAligned = false
          const maxCheckLength = 5 // Let's check the first five lines for alignment
          let offset = 0
          // Compare saved content to find where the mismatch happens
          while (!isAligned && offset < maxCheckLength) {
            isAligned = true // Assume alignment is correct at the start

            // Check the first few stored line numbers and text to ensure alignment
            for (let i = 0; i < Math.min(myText.length, maxCheckLength); i++) {
              const savedContentLine = contentLines.find(line => line.startsWith(`${myLineNumbers[i]}:`))
              const currentLine = `${myLineNumbers[i]}: ${myText[i] || '\n'}` // Create new line to compare (with line number)

              // If there's a mismatch between stored and new line number:text, it's not aligned
              if (savedContentLine && savedContentLine !== currentLine) {
                isAligned = false // If any mismatch is found, set to false
                break
              }
            }

            // If not aligned, remove the first element of myText (shift) and increment the offset
            if (!isAligned) {
              myText = myText.slice(1) // Remove the first element of the text
              offset++ // Move forward to recheck
            }
          }
        }
        // Ensure the text length matches the line numbers length if more lines are added
        if (myText.length > myLineNumbers.length) {
          myText = myText.slice(0, myLineNumbers.length)
        }
        // Loop over the line numbers and match with the text content
        for (let index = 0; index < myLineNumbers.length; index++) {
          const lineNumber = myLineNumbers[index]
          const text = myText[index] // Get the corresponding text for this line number

          if (lineNumber && !capturedLineNumbers.has(lineNumber)) {
            if (text) {
              contentLines.push(`${lineNumber}: ${text}`) // Add the line number and the corresponding text
              if (text.includes(textToFind)) {
                navigationIndex++
                if (navigationIndex === navigation) {
                  console.log('Found the text in line: ' + lineNumber + ' text: ' + text)
                  return true // Return true to stop the outer loop
                }
              }
            } else {
              contentLines.push(`${lineNumber}: \n`) // Handle the empty text case
            }
            capturedLineNumbers.add(lineNumber) // Mark the line number as captured
          }
        }
        return false
      }
      return false
    }

    let position = 0
    let stopFinding = false
    while (position < editorContainer.scrollHeight) {
      await scrollEditor(position)
      stopFinding = extractVisibleText()
      if (stopFinding) {
        await scrollEditor(editorContainer.scrollTop + editorContainer.clientHeight)
        break
      }
      position = editorContainer.scrollTop + editorContainer.clientHeight
      if (Math.ceil(position) + 1 >= editorContainer.scrollHeight) {
        break
      }
    }
    OverleafUtils.toggleEditor()
  }

  // Define a function to split sections based on \section command
  // Define a function to split sections based on \section command
  static extractSections (latexContent) {
    const lines = latexContent.split('\n')
    const sections = []
    let currentSection = null

    lines.forEach(line => {
      // Regex to capture \section{...} even if there is extra text after it, e.g., \label
      const sectionMatch = line.match(/\\section\{(.+?)\}/)
      if (sectionMatch) {
        // If there's a current section being tracked, push it into the array
        if (currentSection) {
          // Remove empty lines from the content
          currentSection.content = currentSection.content.filter(line => line.trim() !== '')
          sections.push(currentSection)
        }
        // Create a new section object
        currentSection = {
          title: sectionMatch[1], // Capture the section title
          content: [line]
        }
      } else if (currentSection) {
        // If a section is being tracked, keep adding non-empty lines to its content
        currentSection.content.push(line)
      }
    })

    // Push the last section if any, after filtering out empty lines
    if (currentSection) {
      currentSection.content = currentSection.content.filter(line => line.trim() !== '')
      sections.push(currentSection)
    }

    return sections
  }

  static async removeContent (callback) {
    const editorContent = document.querySelector('#panel-source-editor > div > div > div.cm-scroller > div.cm-content.cm-lineWrapping')
    if (!editorContent) {
      console.error('Editor content element not found')
    } else {
      while (editorContent.firstChild) {
        editorContent.removeChild(editorContent.firstChild)
      }
      console.log('All child nodes removed from editor content.')
      if (callback) {
        callback()
      }
    }
  }

  static async insertContent (content) {
    const editorContent = document.querySelector('.cm-content')

    if (!editorContent) {
      console.error('Editor elements not found')
      return
    }

    // Helper function to insert text at the current cursor position
    function insertTextAtCursor (text) {
      const range = document.getSelection().getRangeAt(0)
      const textNode = document.createTextNode(text)
      range.deleteContents()
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)

      // Simulate typing event to update the editor content
      const event = new Event('input', { bubbles: true })
      editorContent.dispatchEvent(event)
    }

    // Focus the editor and place the cursor at the end or start
    function focusEditor () {
      editorContent.focus()

      const range = document.createRange()
      const selection = window.getSelection()

      // Move the cursor to the end of the content
      range.selectNodeContents(editorContent)
      range.collapse(false) // Set to true for start, false for end
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // Write the text in parts, simulating a typing experience
    async function writeText (text) {
      focusEditor()

      // Optionally, split the text into lines to insert gradually or simulate typing speed
      const lines = text.split('\n')
      for (let line of lines) {
        insertTextAtCursor(line + '\n')
        // await new Promise((resolve) => setTimeout(resolve, 5)) // Simulate typing delay
      }
    }

    // Start the text insertion
    await writeText(content)
  }

  static getActiveEditor () {
    const codeEditor = document.getElementById('editor-switch-cm6')
    const visualEditor = document.getElementById('editor-switch-rich-text')

    if (codeEditor.checked) {
      return 'Code Editor'
    } else if (visualEditor.checked) {
      return 'Visual Editor'
    } else {
      return 'No editor selected'
    }
  }

  static toggleEditor () {
    const codeEditor = document.getElementById('editor-switch-cm6')
    const visualEditor = document.getElementById('editor-switch-rich-text')

    if (codeEditor.checked) {
      // Switch to Visual Editor
      document.querySelector('label[for="editor-switch-rich-text"]').click()
    } else if (visualEditor.checked) {
      // Switch to Code Editor
      document.querySelector('label[for="editor-switch-cm6"]').click()
    }
  }
  static async generateOutlineContent (callback) {
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }

    // read the document content
    const documents = await OverleafUtils.getAllEditorContent()

    // get all \promptex commands with their arguments
    const promptexCommands = documents.match(/\\promptex{\\textit{([^}]*)::(\d+)}}{([^}]*)}/g)

    // retrieve the database and current criteria list
    let db = window.promptex.storageManager.client.projectDatabase.criterionSchemas
    let currentCriteriaList = window.promptex._overleafManager._currentCriteriaList

    // Clear all annotations in the database for the specific category in currentCriteriaList before adding new ones
    if (db[currentCriteriaList]) {
      for (let attributeType in db[currentCriteriaList]) {
        for (let criterion in db[currentCriteriaList][attributeType]) {
          db[currentCriteriaList][attributeType][criterion].Annotations = [] // Reset the Annotations array
        }
      }
    }

    // For each \promptex command, extract the criterion label and the excerpt (second argument)
    const criterionAnnotations = promptexCommands.map(command => {
      // Updated regex pattern to capture the label, number, and excerpt
      const match = command.match(/\\promptex{\\textit{([^}]*)::(\d+)}}{([^}]*)}/)

      return {
        label: match ? match[1] : null, // Capture the criterion label (part before "::")
        number: match ? match[2] : null, // Capture the number (part after "::")
        excerpt: match ? match[3] : null // Capture the excerpt (second argument)
      }
    }).filter(item => item.label !== null && item.excerpt !== null)

    // Add the annotations to the database only for the currentCriteriaList category
    criterionAnnotations.forEach(({ label, excerpt }) => {
      if (db[currentCriteriaList]) {
        for (let attributeType in db[currentCriteriaList]) {
          if (db[currentCriteriaList][attributeType][label]) {
            // Push the excerpt into the Annotations array
            db[currentCriteriaList][attributeType][label].Annotations.push(excerpt)
          }
        }
      }
    })

    const outlineContent = {}
    window.promptex.storageManager.client.updateSchemas(window.promptex._overleafManager._project, db)
      .then(() => {
        console.log('Annotations updated successfully')
        // Iterate through each attribute type (e.g., 'Essential Attributes', 'Desirable Attributes')
        if (db[currentCriteriaList]) {
          for (let attributeType in db[currentCriteriaList]) {
            // Iterate through each criterion in the attribute type
            for (let criterion in db[currentCriteriaList][attributeType]) {
              const criterionData = db[currentCriteriaList][attributeType][criterion]
              const annotationCount = criterionData.Annotations.length
              // If the criterion has annotations, we add it to the corresponding category in outlineContent
              if (annotationCount > 0) {
                // If the category doesn't exist in outlineContent yet, initialize it as an array
                if (!outlineContent[attributeType]) {
                  outlineContent[attributeType] = []
                }
                // Add the criterion with its annotation count to the category in outlineContent
                outlineContent[attributeType].push(`${criterion} (${annotationCount})`)
              }
            }
          }
        }

        // Return the resulting outlineContent
        if (_.isFunction(callback)) {
          callback(outlineContent)
        }
      })
      .catch(err => {
        console.error('Failed to update annotations:', err)
      })
  }
}

module.exports = OverleafUtils
