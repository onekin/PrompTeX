const _ = require('lodash')

class OverleafUtils {
  static async getAllEditorContent () {
    window.promptex._overleafManager._readingDocument = true
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
        setTimeout(resolve, 120)
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
    window.promptex._overleafManager._readingDocument = false
    fullText = contentLines
      .map(line => line.replace(/^\d+:\s*/, '')) // Remove the leading '{number}: ' pattern
      .join('\n')
    return fullText
  }

  static async scrollToImprovementContent (name, navigation) {
    window.promptex._overleafManager._readingDocument = true
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
        setTimeout(resolve, 120)
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
    window.promptex._overleafManager._readingDocument = false
    // OverleafUtils.toggleEditor()
  }

  static async scrollToAnnotation (name) {
    window.promptex._overleafManager._readingDocument = true
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }
    let textToFind = `\\promptex{\\textit{${name}`
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
        setTimeout(resolve, 120)
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
                return true // Return true to stop the outer loop
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
    window.promptex._overleafManager._readingDocument = false
    // OverleafUtils.toggleEditor()
  }

  static async scrollToConsolidateContent (name, number, type) {
    window.promptex._overleafManager._readingDocument = true
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }
    let textToFind
    if (type === 'title') {
      textToFind = `\\title{${name}`
    } else {
      textToFind = `\\section{${name}`
    }
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
        setTimeout(resolve, 120)
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
                console.log('Found the text in line: ' + lineNumber + ' text: ' + text)
                return true // Return true to stop the outer loop
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
    window.promptex._overleafManager._readingDocument = false
    // OverleafUtils.toggleEditor()
  }

  static extractStructuralBlocks (level, latexContent) {
    const levelsHierarchy = ['title', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']
    const currentLevelIndex = levelsHierarchy.indexOf(level)

    if (currentLevelIndex === -1) {
      throw new Error(`Unknown LaTeX level: ${level}`)
    }

    const pattern = new RegExp(`\\\\${level}\\{(.+?)\\}`)
    const stopPatterns = levelsHierarchy
      .slice(0, currentLevelIndex + 1) // levels at or above current
      .map(lvl => `\\\\${lvl}\\{`)
    const stopRegex = new RegExp(`^(${stopPatterns.join('|')})`)

    const lines = latexContent.split('\n')
    const blocks = []
    let currentBlock = null

    for (let line of lines) {
      const match = line.match(pattern)

      if (match) {
        // Close previous block if one was open
        if (currentBlock) {
          currentBlock.content = currentBlock.content.filter(l => l.trim() !== '')
          blocks.push(currentBlock)
        }

        currentBlock = {
          title: match[1],
          content: [line]
        }
        continue
      }

      if (currentBlock) {
        // Check if this line starts a new block at same or higher level
        if (stopRegex.test(line)) {
          // Close current block
          currentBlock.content = currentBlock.content.filter(l => l.trim() !== '')
          blocks.push(currentBlock)
          currentBlock = null

          // Re-check this line in case it's a start of a new block (important)
          const nextMatch = line.match(pattern)
          if (nextMatch) {
            currentBlock = {
              title: nextMatch[1],
              content: [line]
            }
          }
        } else {
          currentBlock.content.push(line)
        }
      }
    }

    if (currentBlock) {
      currentBlock.content = currentBlock.content.filter(l => l.trim() !== '')
      blocks.push(currentBlock)
    }

    return blocks
  }

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

  static extractSectionsWithTodos (latexContent) {
    const lines = latexContent.split('\n')
    const sections = []
    let currentSection = {
      title: 'Document Title', // Default title section
      content: [],
      todoCount: 0,
      type: 'section'
    }
    const todoRegex = /%%\s*PROMPTEX-/ // ✅ Match TODOs even with variable spaces

    lines.forEach((line) => {
      // ✅ Check for \title{...} to treat as a separate section
      const titleMatch = line.match(/\\title\{(.+?)\}/)
      if (titleMatch && sections.length === 0) {
        currentSection.title = titleMatch[1].trim() // Capture document title
        currentSection.type = 'title'
      }

      // ✅ Check for \section{...} (even if there is extra text after it, e.g., \label)
      const sectionMatch = line.match(/\\section\{(.+?)\}/)
      if (sectionMatch) {
        // ✅ Push all pre-section content as the "title" section
        if (currentSection.content.length > 0) {
          currentSection.content = currentSection.content.filter(line => line.trim() !== '')
          sections.push(currentSection)
        }

        // ✅ Create a new section object
        currentSection = {
          title: sectionMatch[1].trim(),
          content: [line], // Start collecting content for this section
          todoCount: 0
        }
      } else {
        // ✅ If a TODO is found, count it and store the line
        if (todoRegex.test(line)) {
          currentSection.todoCount += 1
        }
        currentSection.content.push(line) // ✅ Store every line properly
      }
    })

    // ✅ Push the last section (including title section) before returning
    if (currentSection.content.length > 0) {
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
    window.promptex._overleafManager._readingDocument = true
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
        // await new Promise((resolve) => setTimeout(resolve, 120)) // Simulate typing delay
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
  static async generateImprovementOutlineContent (callback) {
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
    let dbCopy = JSON.parse(JSON.stringify(db[currentCriteriaList]))
    // Clear all annotations in the database for the specific category in currentCriteriaList before adding new ones
    if (dbCopy) {
      for (let attributeType in dbCopy) {
        for (let criterion in dbCopy[attributeType]) {
          dbCopy[attributeType][criterion].Annotations = [] // Reset the Annotations array
        }
      }
    }
    if (!promptexCommands) {
      console.log('No annotations found in the document')
      callback(null)
    } else {
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
        for (let attributeType in dbCopy) {
          if (dbCopy[attributeType][label]) {
            // Push the excerpt into the Annotations array
            dbCopy[attributeType][label].Annotations.push(excerpt)
          }
        }
      })

      const outlineContent = {}
      window.promptex.storageManager.client.updateSchemas(window.promptex._overleafManager._project, db)
        .then(() => {
          console.log('Annotations updated successfully')
          // Iterate through each attribute type (e.g., 'Essential Attributes', 'Desirable Attributes')
          if (dbCopy) {
            for (let attributeType in dbCopy) {
              // Iterate through each criterion in the attribute type
              for (let criterion in dbCopy[attributeType]) {
                const criterionData = dbCopy[attributeType][criterion]
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

  static async generateConsolidateOutlineContent (callback) {
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }

    // Read the document content
    const documents = await OverleafUtils.getAllEditorContent()
    const sections = OverleafUtils.extractSectionsWithTodos(documents)
    const outlineContent = {}
    sections.forEach(section => {
      if (section.todoCount > 0) {
        outlineContent[section.title] = `${section.title} (${section.todoCount})${section.type}`
      }
    })
    console.log('Outline content:', outlineContent)
    callback(outlineContent)
  }
}

module.exports = OverleafUtils
