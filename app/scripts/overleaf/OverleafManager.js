const CriterionActions = require('./CriterionActions')
const OverleafUtils = require('./OverleafUtils')
const Alerts = require('../utils/Alerts')
const LocalStorageManager = require('../storage/LocalStorageManager')
const _ = require('lodash')
const LatexUtils = require('./LatexUtils')
const Config = require('../Config')
const Utils = require('../utils/Utils')

class OverleafManager {
  constructor () {
    this._project = null
    this._sidebar = null
    this._readingDocument = false
    this._standarized = true
  }

  init () {
    let that = this
    let target = this.findHomeIcon()
    if (target == null) {
      // If the icon is not found, retry after 500ms
      window.setTimeout(() => {
        that.init() // Replace this with the method you are calling (e.g., init)
      }, 500)
      return
    }
    // If the home icon is found, perform your desired actions
    that.projectManagement() // Replace this with the function handling actions when the icon is found
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === 'roleSelected') {
        if (this.isSelectionInsidePanel()) {
          const selection = window.getSelection() // Get the selected text
          let selectedText
          let firstSection
          if (window.getSelection) {
            selectedText = window.getSelection().toString()
          } else if (document.selection && document.selection.type !== 'Control') {
            selectedText = document.selection.createRange().text
          }

          // If there is selected text, show the button
          if (selectedText.trim()) {
            const range = selection.getRangeAt(0)
            /* eslint-disable no-unused-vars */
            const rect = range.getBoundingClientRect()
            let scope = ''
            let humanNote = ''
            if (selectedText.trim().includes('\\title{')) {
              scope = 'document'
            } else if (selectedText.trim().includes('\\section{')) {
              scope = 'section'
            } else {
              scope = 'excerpts'
            }
            if (selectedText.trim().includes('\\humanNote{')) {
              let notes = this.extractHumanNote(selectedText)
              if (notes) {
                humanNote = notes[0]
              }
            }
            let scopedText
            let numberOfExcerpts
            Alerts.infoAlert({ title: request.text, text: selectedText })
            let editor = OverleafUtils.getActiveEditor()
            if (editor === 'Visual Editor') {
              OverleafUtils.toggleEditor()
            }
            Alerts.showLoadingWindowDuringProcess('Reading document content...')
            let documents = await OverleafUtils.getAllEditorContent()
            if (scope === 'document') {
              numberOfExcerpts = 3
              scopedText = 'RESEARCH_PAPER: [' + LatexUtils.processTexDocument(documents) + ']'
              Alerts.closeLoadingWindow()
            } else if (scope === 'section') {
              numberOfExcerpts = 2
              const sectionsArray = OverleafUtils.extractSections(documents)
              const sectionsFromText = this.extractSectionsFromText(selectedText)
              firstSection = sectionsFromText[0]
              const scopedSection = sectionsArray.find(section => section.title === firstSection)
              scopedText = 'RESEARCH_PAPER SECTION: [' + scopedSection.content.join('\n') + ']'
              Alerts.closeLoadingWindow()
            } else if (scope === 'excerpts') {
              numberOfExcerpts = 1
              scopedText = 'RESEARCH_PAPER FRAGMENT: [' + selectedText + ']'
            }
            const spaceMode = document.getElementById('modeToggle').checked ? 'Rhetoric Mode' : 'Content Mode'
            let role
            let modeInstructions = ''
            if (spaceMode === 'Rhetoric Mode') {
              role = request.text + 'Rhetorical'
              modeInstructions = 'Please focus on the rhetorical aspects of the text, not on the content.'
            } else {
              role = request.text
              modeInstructions = 'Please focus on the content of the text, not on the rhetorical aspects.'
            }
            const selectedRole = Object.values(Config.roles).find(el => el.name === role)
            let roleDescription = selectedRole.description
            let prompt = Config.prompts.getFeedback
            prompt = prompt.replaceAll('[CONTENT]', scopedText)
            prompt = prompt.replaceAll('[ROLE]', roleDescription + ' ' + modeInstructions)
            prompt = prompt.replaceAll('[NUMBER]', numberOfExcerpts)
            prompt = prompt.replaceAll('[NOTE]', 'Please, do this task considering that: ' + humanNote)
            console.log(prompt)
            await CriterionActions.askForFeedback(documents, prompt, selectedRole.name, spaceMode, scopedText, roleDescription, modeInstructions, scope, firstSection)
          }
        } else {
          console.log('Selection is outside the "panel-ide" element.')
        }
      }
    })
  }

  findHomeIcon () {
    // Check for Font Awesome icon
    let faIcon = document.querySelector('i.fa.fa-home.fa-fw')
    // Check for Material Symbols icon
    let materialIcon = Array.from(document.querySelectorAll("span.material-symbols.align-text-bottom[aria-hidden='true']"))
      .find(span => span.textContent.trim() === 'home')

    return faIcon || materialIcon
  }

  projectManagement () {
    let that = this
    let project = that.getProject()
    if (project) {
      this._project = project
      this.loadStorage(project, () => {
        // console.log(window.promptex.storageManager.client.getSchemas())
        // that.addButton()
        that.addConfigurationButton()
        // that.addStabilizeButton()
        that.addOutlineButton()
        that.monitorEditorContent()
      })
    }
  }

  extractSectionsFromText (text) {
    const sectionPattern = /\\section{(.*?)}/g // RegEx pattern to capture content inside \section{}
    const matches = [...text.matchAll(sectionPattern)] // Extract all matches
    return matches.map(match => match[1]) // Return only the content inside {}
  }

  extractHumanNote (text) {
    const sectionPattern = /\\humanNote{(.*?)}/g // RegEx pattern to capture content inside \section{}
    const matches = [...text.matchAll(sectionPattern)] // Extract all matches
    return matches.map(match => match[1]) // Return only the content inside {}
  }

  isSelectionInsidePanel () {
    const panel = document.getElementById('panel-ide') // Get the "panel-ide" element
    const selection = window.getSelection() // Get the current selection

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0) // Get the first range of the selection
      const selectedNode = range.commonAncestorContainer // Find the deepest common ancestor of the selection
      return panel.contains(selectedNode) // Check if the selected node is within "panel-ide"
    }
    return false // No selection or not inside the panel
  }

  monitorEditorContent () {
    // Use setInterval to check every second (1000ms)
    setInterval(() => {
      // Get all elements with the class 'ol-cm-command-promptex'
      // let visualElements = document.querySelectorAll('.ol-cm-command-promptex')
      // this.monitorVisualEditorContent(visualElements)
      // let codeElements = document.querySelectorAll('span.tok-typeName')
      // Filter the elements to find ones containing '\promptex'
      // const promptexElements = Array.from(codeElements).filter(element =>
      //   element.textContent.trim() === '\\promptex'
      // )
      // let editor = OverleafUtils.getActiveEditor()
      // if (editor === 'Code Editor') {
      //   this.monitorCodeEditorContent(promptexElements)
      // }
      let codeElements = document.querySelectorAll('div.cm-line')
      // ✅ Filter elements that contain comments starting with "%% PROMPTEX"
      let promptexComments = Array.from(codeElements)
        .filter(element => element.textContent.startsWith('%% PROMPTEX')) // Keep only matching comments
      let editor = OverleafUtils.getActiveEditor()
      if (editor === 'Code Editor') {
        this.monitorCodeEditorContentPromptex(promptexComments)
      }
    }, 500) // Every second
  }

  monitorVisualEditorContent (elements) {
    elements.forEach((element) => {
      if (!this.isSelected(element)) {
        // Find the first .ol-cm-command-textit inside the element
        let commandTextit = element.querySelector('.ol-cm-command-textit')

        if (commandTextit) {
          // Extract the text content from the .ol-cm-command-textit element
          let commandText = commandTextit.textContent
          let criterion = ''
          let feedbackId = ''
          // Check if the content matches the format 'text::number'
          const match = commandText.match(/(.*)::(\d+)::(.*)/)

          if (match) {
            criterion = match[1]
            feedbackId = match[3]
            const number = parseInt(match[2], 10)

            // Apply background color based on the number
            if (number === 0) {
              element.style.backgroundColor = '#8ACF8F' // Set background to green
            } else if (number === 1) {
              element.style.backgroundColor = 'yellow' // Set background to yellow
            } else if (number === 2) {
              element.style.backgroundColor = '#ff6666' // Set background to red
            } else {
              element.style.backgroundColor = '' // Reset background for other cases
            }
          }

          // Set the display of the first .ol-cm-command-textit element to 'none'
          commandTextit.style.display = 'none'
          // Hide the first two .tok-punctuation.ol-cm-punctuation elements
          const previousSibling = element.previousElementSibling
          const secondPreviousSibling = previousSibling?.previousElementSibling
          const nextSibling = element.nextElementSibling
          if (previousSibling && secondPreviousSibling) {
            previousSibling.style.display = 'none' // cm-matchingBracket
            secondPreviousSibling.style.display = 'none' // \promptex
            nextSibling.style.display = 'none' // cm-punctuation
            // firstBracket.style.display = 'none'; // cm-punctuation
          }
          if (secondPreviousSibling && secondPreviousSibling.textContent && secondPreviousSibling.textContent === 'ex') {
            const thirdPreviousSibling = secondPreviousSibling.previousElementSibling
            const forthPreviousSibling = thirdPreviousSibling.previousElementSibling
            thirdPreviousSibling.style.display = 'none' // cm-punctuation
            forthPreviousSibling.style.display = 'none' // cm-punctuation
          }
          // Select all elements with both classes 'tok-punctuation' and 'ol-cm-punctuation' inside the current item
          element.querySelectorAll('.tok-punctuation.ol-cm-punctuation').forEach(punctuationElement => {
            // Hide the punctuation element by setting display to 'none'
            punctuationElement.style.display = 'none'
          })
          element.addEventListener('contextmenu', function (event) {
            event.preventDefault() // Prevent the default right-click menu
            let feedback = window.promptex.storageManager.client.findFeedback(feedbackId).feedback
            let info = ''
            if (feedback && feedback.comment && feedback.sentiment) {
              const assessmentFace = Utils.getColoredFace(feedback.sentiment)
              info += '<b>Feedback</b> ' + assessmentFace + ': ' + feedback.comment + '<br><br>'
            }
            // Show alert with the tooltip message
            Alerts.infoAnswerAlert({ title: criterion, text: info })
            return false // Additional return to ensure default action is canceled
          })
        }
      }
    })
  }

  monitorCodeEditorContent (elements) {
    if (!window.promptex._overleafManager._readingDocument) {
      // Get all elements with the class 'ol-cm-command-promptex'
      elements.forEach((element) => {
        if (!this.isSelectedInCodeEditor(element)) {
          let parent = element.parentElement
          let promptexFound = false // Flag to mark when we find '\\promptex'
          let punctuationCount = 0 // Counter to track the number of 'tok-punctuation' spans
          let desiredTextNode = null
          // Iterate over the child nodes of the parent element
          for (let i = 0; i < parent.childNodes.length; i++) {
            const node = parent.childNodes[i]
            // Check for '\\promptex' in 'tok-typeName' class
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('tok-typeName') && node.textContent.trim() === '\\promptex') {
              promptexFound = true // Found the '\\promptex'
            }
            // If '\\promptex' has been found, start counting punctuations
            if (promptexFound) {
              if (node.nodeType === Node.ELEMENT_NODE && (node.classList.contains('tok-punctuation') || node.classList.contains('cm-lintRange'))) {
                punctuationCount++ // Increment the punctuation count
              }
              // If we are past the second punctuation, find the first text node
              if (punctuationCount === 2) {
                // Move to the next nodes to find a text node
                for (let j = i + 1; j < parent.childNodes.length; j++) {
                  const nextNode = parent.childNodes[j]
                  if (nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent.trim() !== '') {
                    desiredTextNode = nextNode.textContent.trim()
                    // Check if the previous sibling is a span with class "ol-cm-spelling-error"
                    const previousNode = nextNode.previousSibling
                    if (
                      previousNode &&
                      previousNode.nodeType === Node.ELEMENT_NODE &&
                      previousNode.tagName === 'SPAN' &&
                      previousNode.classList.contains('ol-cm-spelling-error') &&
                      previousNode.textContent.trim() !== ''
                    ) {
                      desiredTextNode = previousNode.textContent.trim() + ' ' + desiredTextNode
                      console.log('Added text from previous span with spelling error:', previousNode.textContent.trim())
                    }
                    // Check if the next sibling is a span with class "ol-cm-spelling-error"
                    const followingNode = nextNode.nextSibling
                    if (
                      followingNode &&
                      followingNode.nodeType === Node.ELEMENT_NODE &&
                      followingNode.tagName === 'SPAN' &&
                      followingNode.classList.contains('ol-cm-spelling-error') &&
                      followingNode.textContent.trim() !== ''
                    ) {
                      desiredTextNode += ' ' + followingNode.textContent.trim()
                      console.log('Added text from next span with spelling error:', followingNode.textContent.trim())
                    }
                    break
                  }
                }
                break // Stop the outer loop as we have found our result
              }
            }
          }
          // Log the desired text node
          if (!desiredTextNode) {
            console.log('Text node after second punctuation not found.')
          }
          try {
            // Check if the content matches the format 'text::number'
            const match = desiredTextNode.match(/(.*)::(\d+)::(.*)/)
            const criterion = match[1]
            const feedbackId = match[3]
            if (match) {
              const number = parseInt(match[2], 10)
              // Apply background color based on the number
              if (number === 0) {
                parent.style.backgroundColor = '#8ACF8F' // Set background to green
              } else if (number === 1) {
                parent.style.backgroundColor = 'yellow' // Set background to yellow
              } else if (number === 2) {
                parent.style.backgroundColor = '#ff6666' // Set background to red
              } else {
                parent.style.backgroundColor = '' // Reset background for other cases
              }
            }
            parent.addEventListener('contextmenu', function (event) {
              event.preventDefault() // Prevent the default right-click menu
              let feedback = window.promptex.storageManager.client.findFeedback(feedbackId).feedback
              let info = ''
              if (feedback && feedback.comment && feedback.sentiment) {
                const assessmentFace = Utils.getColoredFace(feedback.sentiment)
                info += '<b>Feedback</b> ' + assessmentFace + ': ' + feedback.comment + '<br><br>'
              }
              // Show alert with the tooltip message
              Alerts.infoAnswerAlert({ title: criterion, text: info })
              return false // Additional return to ensure default action is canceled
            })
          } catch (error) {
            // console.error('Failed to parse LLM response:', error)
            // Alerts.showErrorToast('Failed to parse LLM response. Please ensure the response is in valid JSON format.')
          }
        }
      })
    }
  }

  monitorCodeEditorContentPromptex (elements) {
    if (!window.promptex._overleafManager._readingDocument) {
      elements.forEach((element) => {
        // if (!this.isSelectedInCodeEditor(element)) {
        element.style.backgroundColor = '#FFD700'
        // }
      })
    }
  }

  isSelected (element) {
    const selection = window.getSelection()

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0) // Get the first range (caret position)

      // Find the container where the caret is located (text node or element)
      let caretContainer = range.startContainer

      // If the caret is inside a text node, get its parent element
      if (caretContainer.nodeType === Node.TEXT_NODE) {
        caretContainer = caretContainer.parentNode
      }
      // Check if the element contains the caret container (either directly or via descendants)
      if (element.contains(caretContainer)) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  isSelectedInCodeEditor (element) {
    const selection = window.getSelection()

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0) // Get the first range (caret position)

      // Find the container where the caret is located (text node or element)
      let caretContainer = range.startContainer

      // If the caret is inside a text node, get its parent element
      if (caretContainer.nodeType === Node.TEXT_NODE) {
        caretContainer = caretContainer.parentNode
      }
      // Check if the element contains the caret container (either directly or via descendants)
      if (element.parentElement.contains(caretContainer)) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  addConfigurationButton () {
    // Create the 'Check Criteria' button element
    let promptConfigurationBtn = document.createElement('div')
    promptConfigurationBtn.classList.add('toolbar-item')
    promptConfigurationBtn.innerHTML = `
      <button type='button' class='btn btn-full-height' id='checkCriteriaBtn'>
        <i class='fa fa-arrow-up fa-fw' aria-hidden='true'></i>
        <p class='toolbar-label'>Configuration</p>
      </button>
    `
    // Locate the toolbar where the button should be added
    let toolbar = document.querySelector('.toolbar-right')

    // Insert the 'Check Criteria' button at the end of the toolbar list
    if (toolbar) {
      toolbar.appendChild(promptConfigurationBtn)
    } else {
      console.error('Toolbar not found')
    }

    promptConfigurationBtn.addEventListener('click', async () => {
      // const content = await OverleafUtils.getAllEditorContent()
      promptConfigurationBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('/pages/promptConfiguration.html'), '_blank')
      })
    })

    // Create the switch button container
    let modeSwitchContainer = document.createElement('div')
    modeSwitchContainer.classList.add('toolbar-item', 'mode-switch-container')
    modeSwitchContainer.innerHTML = `
      <label class="switch">
        <input type="checkbox" id="modeToggle">
        <span class="slider"></span>
      </label>
      <span id="modeLabel">Content Mode</span>
    `

    // Insert the switch button **before** the "Review" button
    if (toolbar) {
      toolbar.insertBefore(modeSwitchContainer, toolbar.firstChild)
    }

    // Add styles dynamically for the switch button
    let style = document.createElement('style')
    style.innerHTML = `
      .mode-switch-container {
          display: flex;
          align-items: center;
          gap: 10px; /* Space between switch and text */
          padding: 5px 12px;
          background-color: #1c1f26; /* Match toolbar background */
          border-radius: 6px;
          height: 40px; /* Ensure it aligns with other buttons */
          min-width: 180px; /* Enough space for text in one line */
      }
    
      .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 25px;
      }
    
      .switch input {
          opacity: 0;
          width: 0;
          height: 0;
      }
    
      .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #2196F3;
          transition: 0.4s;
          border-radius: 25px;
      }
    
      .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 2.5px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
      }
    
      input:checked + .slider {
          background-color: #2196F3;
      }
    
      input:checked + .slider:before {
          transform: translateX(24px);
      }
    
      #modeLabel {
          font-size: 14px;
          font-weight: bold;
          color: white; /* Ensures visibility */
          white-space: nowrap; /* Prevents text wrapping */
      }
    `

    // Append the styles to the document head
    document.head.appendChild(style)

    // Add event listener to toggle between Content Mode and Rhetoric Mode
    document.getElementById('modeToggle').addEventListener('change', function () {
      let modeLabel = document.getElementById('modeLabel')
      modeLabel.textContent = this.checked ? 'Rhetoric Mode' : 'Content Mode'
    })
  }

  // Function to insert TODOs into the LaTeX content
  insertTODOsIntoLatex (document, sections) {
    let updatedDocument = document
    // Iterate through each section from the JSON response
    sections.forEach(section => {
      const sectionName = section.name
      const comment = section.comment
      const todos = section.todo.split(',')
      // Create the TODO lines for this section
      const todoLines = todos.map(todo => `%%TODO: ${todo.trim()}`).join('\n')

      // Regex pattern to find the specific section in the LaTeX document
      const sectionPattern = new RegExp(`\\\\section\\{${sectionName}\\}`, 'i')
      // Find and replace the section with the TODOs added after it
      updatedDocument = updatedDocument.replace(
        sectionPattern,
        `\\section{${sectionName}}\n%%Changes in this section: ${comment}\n\n${todoLines}`
      )
    })
    return updatedDocument
  }

  addOutlineButton () {
    // Create the container for the new outline
    const outlineContainer = document.querySelector('.outline-container')

    // Create a new pane for the outline
    const newImprovementOutlinePane = document.createElement('div')
    newImprovementOutlinePane.classList.add('outline-pane2')
    newImprovementOutlinePane.classList.add('newImprovementOutlinePane')

    // Create the header for the new outline
    const newImprovementHeader = document.createElement('header')
    newImprovementHeader.classList.add('outline-header')
    newImprovementHeader.classList.add('newImprovementHeader')
    newImprovementHeader.classList.add('closed')

    const headerImprovementButton = document.createElement('button')
    headerImprovementButton.classList.add('outline-header-expand-collapse-btn')
    headerImprovementButton.setAttribute('aria-label', 'Show Foundation outline')
    headerImprovementButton.setAttribute('aria-expanded', 'false') // Initially collapsed

    const caretImprovementIcon = document.createElement('span')
    caretImprovementIcon.classList.add('material-symbols', 'outline-caret-icon')
    caretImprovementIcon.classList.add('improvement-caret-icon')
    caretImprovementIcon.setAttribute('aria-hidden', 'true')
    caretImprovementIcon.textContent = 'keyboard_arrow_right' // Initially right arrow (collapsed)

    const headerImprovementTitle = document.createElement('h4')
    headerImprovementTitle.classList.add('outline-header-name2')
    headerImprovementTitle.textContent = 'TODOs outline' // Update title to "Foundation outline"

    // Append the caret and title to the header button, and the button to the header
    headerImprovementButton.appendChild(caretImprovementIcon)
    headerImprovementButton.appendChild(headerImprovementTitle)
    newImprovementHeader.appendChild(headerImprovementButton)
    newImprovementOutlinePane.appendChild(newImprovementHeader)
    /*
    // Create a new pane for the outline
    const newConsolidateOutlinePane = document.createElement('div')
    newConsolidateOutlinePane.classList.add('outline-pane2')

    // Create the header for the new outline
    const newConsolidateHeader = document.createElement('header')
    newConsolidateHeader.classList.add('outline-header')
    newConsolidateHeader.classList.add('closed')

    const headerConsolidateButton = document.createElement('button')
    headerConsolidateButton.classList.add('outline-header-expand-collapse-btn')
    headerConsolidateButton.setAttribute('aria-label', 'Show Foundation outline')
    headerConsolidateButton.setAttribute('aria-expanded', 'false') // Initially collapsed

    const caretConsolidateIcon = document.createElement('span')
    caretConsolidateIcon.classList.add('material-symbols', 'outline-caret-icon')
    caretConsolidateIcon.setAttribute('aria-hidden', 'true')
    caretConsolidateIcon.textContent = 'keyboard_arrow_right' // Initially right arrow (collapsed)

    const headerConsolidateTitle = document.createElement('h4')
    headerConsolidateTitle.classList.add('outline-header-name2')
    headerConsolidateTitle.textContent = 'Consolidate outline' // Update title to "Foundation outline"

    // Append the caret and title to the header button, and the button to the header
    headerConsolidateButton.appendChild(caretConsolidateIcon)
    headerConsolidateButton.appendChild(headerConsolidateTitle)
    newConsolidateHeader.appendChild(headerConsolidateButton)
    newConsolidateOutlinePane.appendChild(newConsolidateHeader)
    */
    // Append the new outline pane to the container BEFORE the original outline
    const originalOutline = document.querySelector('.outline-pane')
    // outlineContainer.insertBefore(newConsolidateOutlinePane, originalOutline)
    outlineContainer.insertBefore(newImprovementOutlinePane, originalOutline)
    const outlinePanel = document.querySelector('#panel-outline')

    // Set the height and min-height dynamically
    if (outlinePanel) {
      outlinePanel.style.height = '50%' // Set height to 50%
      outlinePanel.style.minHeight = '96px'
    }

    // Select all outline panes
    const outlinePanes = document.querySelectorAll('.outline-pane')

    // Set height for each pane to split space equally
    outlinePanes.forEach(pane => {
      pane.style.height = '50%'
    })

    // Handle header click to show/hide the outline body of THIS outline only
    newImprovementHeader.addEventListener('click', (event) => {
      event.stopPropagation() // Prevent interference with other outlines

      const isHidden = newImprovementHeader.classList.contains('closed')
      // Toggle between opened and closed state
      if (isHidden) {
        newImprovementHeader.classList.replace('closed', 'opened')
        // Ensure outline body is visible
        const outlineBody = document.createElement('div')
        outlineBody.classList.add('outline-body')
        outlineBody.classList.add('newImprovementOutlineBody')
        // Create the root list for the items
        const rootList = document.createElement('ul')
        rootList.classList.add('outline-item-list', 'outline-item-list-root')
        rootList.setAttribute('role', 'tree')
        outlineBody.appendChild(rootList)

        OverleafUtils.generateImprovementOutlineContent(async (outlineContent) => {
          if (!outlineContent) {
            Alerts.infoAlert({ title: 'No annotations found', text: 'No annotation found in the document.' })
          } else {
            // Iterate through the content to build the outline
            Object.keys(outlineContent).forEach((category) => {
              outlineContent[category].forEach((subItem) => {
                // Create a parent item for each category
                const categoryLi = document.createElement('li')
                categoryLi.classList.add('outline-item')
                categoryLi.setAttribute('role', 'treeitem')
                categoryLi.setAttribute('aria-expanded', 'true')
                categoryLi.style.marginLeft = '5px' // Adjust this value as needed

                const categoryDiv = document.createElement('div')
                categoryDiv.classList.add('outline-item-row')

                const categoryTitle = document.createElement('button')
                categoryTitle.classList.add('outline-item-link')
                const categorySpan = document.createElement('span')
                categorySpan.style.paddingLeft = '20px' // Adjust the value as needed
                categorySpan.textContent = subItem
                categoryTitle.appendChild(categorySpan)
                categoryTitle.setAttribute('data-navigation', '1')
                categoryTitle.addEventListener('click', async () => {
                  // Get criterion content
                  var match = subItem.match(/^(.+)\s\((\d+)\)$/)

                  if (match) {
                    // match[1] is the name (e.g., 'Artifact Detail')
                    // match[2] is the number (e.g., '1')
                    var name = match[1]
                    var number = match[2]

                    // Get the navigation attribute from the button
                    var navigation = categoryTitle.getAttribute('data-navigation')

                    // Log the extracted name, number, and navigation attribute
                    console.log('Name:', name, '| Number:', number, '| Navigation:', navigation)
                    await OverleafUtils.scrollToImprovementContent(name, parseInt(navigation))
                    if (navigation === number) {
                      categoryTitle.setAttribute('data-navigation', '1')
                    } else {
                      let newNavigation = (parseInt(navigation) + 1).toString()
                      categoryTitle.setAttribute('data-navigation', newNavigation)
                    }
                  }
                })
                categoryDiv.appendChild(categoryTitle)
                categoryLi.appendChild(categoryDiv)
                rootList.appendChild(categoryLi)
              })
            })
            let treeDiv = document.getElementById('panel-file-tree')
            // Change the data-panel-size attribute
            treeDiv.setAttribute('data-panel-size', '80.5') // You can set it to any value
            // Change the flex style property
            treeDiv.style.flex = '80.5 1 0px' // Update the first number to match the new panel size
            let separator = treeDiv.nextElementSibling
            // Change the 'data-panel-resize-handle-enabled' attribute to 'true'
            separator.setAttribute('data-panel-resize-handle-enabled', 'true')
            // Change the 'aria-valuenow' attribute to '55'
            separator.setAttribute('aria-valuenow', '80')
            // Select the inner div with the class 'vertical-resize-handle'
            const innerHandle = separator.querySelector('.vertical-resize-handle')
            // Mouse down starts the resizing
            let isResizing = false
            innerHandle.addEventListener('mousedown', (e) => {
              isResizing = true
              document.body.style.cursor = 'row-resize' // Change the cursor when resizing
            })
            document.addEventListener('mousemove', (e) => {
              if (isResizing) {
                const panelOutline = document.getElementById('panel-outline')
                const newSize = e.clientY // Use the Y position of the mouse to calculate the new size
                panelOutline.style.flex = `${newSize} 1 0px` // Adjust flex-grow// property dynamically
                panelOutline.setAttribute('data-panel-size', newSize) // Update the data attribute
              }
            })
            document.addEventListener('mouseup', () => {
              isResizing = false
              document.body.style.cursor = 'default' // Reset the cursor
            })
            // Add the 'vertical-resize-handle-enabled' class to the inner div
            innerHandle.classList.add('vertical-resize-handle-enabled')
            let panelOutline = separator.nextElementSibling
            // Change the 'data-panel-size' attribute to '44.8'
            panelOutline.setAttribute('data-panel-size', '44.8')
            // Change the 'flex' value in the style property
            panelOutline.style.flex = '44.8 1 0px'
            // Add the outline body to the pane, and let it push content down
            newImprovementOutlinePane.appendChild(outlineBody)
          }
        })
      } else {
        newImprovementHeader.classList.replace('opened', 'closed')
        const outlineBody = newImprovementOutlinePane.querySelector('.outline-body')
        if (outlineBody) {
          newImprovementOutlinePane.removeChild(outlineBody) // Remove from DOM
        }
      }
      caretImprovementIcon.textContent = isHidden ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
      // headerButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false') // Toggle aria-expanded
    })

    // Handle header click to show/hide the outline body of THIS outline only
    /* newConsolidateHeader.addEventListener('click', (event) => {
      event.stopPropagation() // Prevent interference with other outlines
      const isHidden = newConsolidateHeader.classList.contains('closed')
      // Toggle between opened and closed state
      if (isHidden) {
        newConsolidateHeader.classList.replace('closed', 'opened')
        // Ensure outline body is visible
        const outlineBody = document.createElement('div')
        outlineBody.classList.add('outline-body')

        // Create the root list for the items
        const rootList = document.createElement('ul')
        rootList.classList.add('outline-item-list', 'outline-item-list-root')
        rootList.setAttribute('role', 'tree')
        outlineBody.appendChild(rootList)

        OverleafUtils.generateConsolidateOutlineContent(async (outlineContent) => {
          if (Object.keys(outlineContent).length === 0) {
            Alerts.infoAlert({ title: 'No sections with TODOs found', text: 'No annotation found in the document.' })
          } else {
            // Iterate through the content to build the outline
            Object.keys(outlineContent).forEach((category) => {
              // Create a parent item for each category
              const categoryLi = document.createElement('li')
              categoryLi.classList.add('outline-item')
              categoryLi.setAttribute('role', 'treeitem')
              categoryLi.setAttribute('aria-expanded', 'true')
              categoryLi.style.marginLeft = '5px' // Adjust this value as needed

              const categoryDiv = document.createElement('div')
              categoryDiv.classList.add('outline-item-row')

              const categoryTitle = document.createElement('button')
              categoryTitle.classList.add('outline-item-link')
              const value = outlineContent[category]
              const categorySpan = document.createElement('span')
              categorySpan.style.paddingLeft = '20px' // Adjust the value as needed
              categorySpan.textContent = value
              categoryTitle.appendChild(categorySpan)
              categoryTitle.setAttribute('data-navigation', '1')
              categoryTitle.addEventListener('click', async () => {
                // Get criterion content
                var match = value.match(/^(.+)\s\((\d+)\)$/)

                if (match) {
                  var name = match[1]
                  var number = match[2]

                  // Get the navigation attribute from the button
                  var navigation = categoryTitle.getAttribute('data-navigation')

                  // Log the extracted name, number, and navigation attribute
                  console.log('Name:', name, '| Number:', number, '| Navigation:', navigation)
                  await OverleafUtils.scrollToConsolidateContent(name, parseInt(navigation))
                  if (navigation === number) {
                    categoryTitle.setAttribute('data-navigation', '1')
                  } else {
                    let newNavigation = (parseInt(navigation) + 1).toString()
                    categoryTitle.setAttribute('data-navigation', newNavigation)
                  }
                }
              })
              categoryDiv.appendChild(categoryTitle)
              categoryLi.appendChild(categoryDiv)
              rootList.appendChild(categoryLi)
            })
            let treeDiv = document.getElementById('panel-file-tree')
            // Change the data-panel-size attribute
            treeDiv.setAttribute('data-panel-size', '80.5') // You can set it to any value
            // Change the flex style property
            treeDiv.style.flex = '80.5 1 0px' // Update the first number to match the new panel size
            let separator = treeDiv.nextElementSibling
            // Change the 'data-panel-resize-handle-enabled' attribute to 'true'
            separator.setAttribute('data-panel-resize-handle-enabled', 'true')
            // Change the 'aria-valuenow' attribute to '55'
            separator.setAttribute('aria-valuenow', '80')
            // Select the inner div with the class 'vertical-resize-handle'
            const innerHandle = separator.querySelector('.vertical-resize-handle')
            // Mouse down starts the resizing
            let isResizing = false
            innerHandle.addEventListener('mousedown', (e) => {
              isResizing = true
              document.body.style.cursor = 'row-resize' // Change the cursor when resizing
            })
            document.addEventListener('mousemove', (e) => {
              if (isResizing) {
                const panelOutline = document.getElementById('panel-outline')
                const newSize = e.clientY // Use the Y position of the mouse to calculate the new size
                panelOutline.style.flex = `${newSize} 1 0px` // Adjust flex-grow// property dynamically
                panelOutline.setAttribute('data-panel-size', newSize) // Update the data attribute
              }
            })
            document.addEventListener('mouseup', () => {
              isResizing = false
              document.body.style.cursor = 'default' // Reset the cursor
            })
            // Add the 'vertical-resize-handle-enabled' class to the inner div
            innerHandle.classList.add('vertical-resize-handle-enabled')
            let panelOutline = separator.nextElementSibling
            // Change the 'data-panel-size' attribute to '44.8'
            panelOutline.setAttribute('data-panel-size', '44.8')
            // Change the 'flex' value in the style property
            panelOutline.style.flex = '44.8 1 0px'
            // Add the outline body to the pane, and let it push content down
            newConsolidateOutlinePane.appendChild(outlineBody)
          }
        })
      } else {
        newConsolidateHeader.classList.replace('opened', 'closed')
        const outlineBody = newConsolidateOutlinePane.querySelector('.outline-body')
        if (outlineBody) {
          newConsolidateOutlinePane.removeChild(outlineBody) // Remove from DOM
        }
      }
      caretConsolidateIcon.textContent = isHidden ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
      // headerButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false') // Toggle aria-expanded
    }) */
  }

  displayImprovementOutlineContent () {
    let newImprovementHeader = document.querySelector('.newImprovementHeader')
    let newImprovementOutlineBody = document.querySelector('.newImprovementOutlineBody')
    if (newImprovementHeader && newImprovementOutlineBody) {
      newImprovementHeader.click()
      newImprovementHeader.click()
    } else {
      newImprovementHeader.click()
    }
  }

  showCriteriaSidebar (defaultList = 0) {
    // Check if the sidebar already exists
    let existingSidebar = document.getElementById('criteriaSidebar')

    if (!existingSidebar) {
      // Create the sidebar
      let sidebar = document.createElement('div')
      sidebar.id = 'criteriaSidebar'
      sidebar.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <br>
        <h2 style="margin: 0; flex-grow: 1;">Improvement Cycle</h2>
        <button id='closeSidebar' style="background-color: transparent; border: none; font-size: 16px; cursor: pointer; align-self: flex-start;">X</button>
        <hr>
      </div>
      <div id='dropdown-container'>
        <select id='criteriaSelector'>
          ${Object.keys(window.promptex.storageManager.client.getSchemas()).map(list => `<option value='${list}'>${list}</option>`).join('')}
        </select>
        <button id='createNewList' class='createButton'>+Schema</button>
        <!--<button id='addCategoryBtn' class='createButton'>+Category</button>-->
      </div>
      <div id='criteriaContent'></div>
      <div id='importForm' style='display: none'>
        <h3>Import Criteria List</h3>
        <label>Criteria List Name:</label>
        <input type='text' id='newListName' placeholder='Enter list name' />
        <label>Categories:</label>
        <textarea id='newCategories' placeholder='Enter categories and criteria (format: category1: criterion1, criterion2 category2: criterion3)' style='width: 100% height: 80px'></textarea>
        <button id='submitNewCriteria'>Save</button>
      </div>
      <hr>
      <button id='promptConfigurationBtn' style="background-color: #318098; color: white; border: 1px solid #ccc; padding: 10px; cursor: pointer; width: 100%;">Prompt Configuration</button></br>
      <button id='resetDatabaseBtn' style="background-color: #ff6666; color: white; border: 1px solid #ccc; padding: 10px; cursor: pointer; width: 100%;">Reset</button>
    `

      document.body.appendChild(sidebar)
      this._sidebar = sidebar
      // Add event listener to the dropdown to dynamically load new criteria
      let selector = document.getElementById('criteriaSelector')
      selector.addEventListener('change', (event) => {
        this.loadCriteriaList(event.target.value, window.promptex.storageManager.client.getSchemas())
        this._currentCriteriaList = event.target.value
      })
      if (!this._currentCriteriaList) {
        // Load the default list (first list) when the sidebar first opens
        let defaultList = Object.keys(window.promptex.storageManager.client.getSchemas())[0]
        this.loadCriteriaList(defaultList, window.promptex.storageManager.client.getSchemas())
      } else {
        this.loadCriteriaList(this._currentCriteriaList, window.promptex.storageManager.client.getSchemas())
      }

      // Add close functionality to the sidebar
      let closeButton = document.getElementById('closeSidebar')
      closeButton.addEventListener('click', () => {
        sidebar.remove() // Close the sidebar by removing it from the DOM
      })

      // Handle submitting new criteria
      let createListBtn = document.getElementById('createNewList')
      createListBtn.addEventListener('click', () => {
        this.createNewList()
      })

      // Add event listener for 'Reset Database' button
      let resetDatabaseBtn = document.getElementById('resetDatabaseBtn')
      resetDatabaseBtn.addEventListener('click', () => {
        const projectId = window.promptex._overleafManager._project // Replace with your method to retrieve the current project ID
        // Call the cleanDatabase function
        window.promptex.storageManager.cleanDatabase(projectId, async (error) => {
          if (error) {
            console.error('Failed to reset the database:', error)
            alert('Failed to reset the database. Please try again.')
          } else {
            console.log('Database reset successfully.')
            alert('Database has been reset to default.')
            // Optionally reload the criteria list to reflect the reset state
            // this.loadCriteriaList(Object.keys(window.promptex.storageManager.client.getSchemas())[0], window.promptex.storageManager.client.getSchemas())
            // const originalDocument = await OverleafUtils.getAllEditorContent()
            // let documents = LatexUtils.removeCommentsFromLatex(originalDocument)
            // OverleafUtils.insertContent(documents)
            window.location.reload()
            // window.location.reload()
          }
        })
      })
      let promptConfigurationBtn = document.getElementById('promptConfigurationBtn')
      promptConfigurationBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('/pages/promptConfiguration.html'), '_blank')
      })
    }
  }

  loadCriteriaList (listName, database) {
    let contentDiv = document.getElementById('criteriaContent')
    contentDiv.innerHTML = '' // Clear previous content
    if (database[listName]) {
      for (const category in database[listName]) {
        // Add a horizontal line between categories
        if (Object.keys(database[listName]).indexOf(category) !== 0) {
          let hr = document.createElement('hr')
          hr.classList.add('category-separator')
          contentDiv.appendChild(hr)
        }

        // Create a category container and append it to the main content div
        let categoryDiv = document.createElement('div')
        categoryDiv.classList.add('criteria-category')
        let categoryTitle = category.replaceAll(' ', '')
        categoryDiv.innerHTML = `
        <div style='display: flex; align-items: center'>
          <h3 style='display: inline-block; margin-right: 10px;'>${category}</h3>
          <button class='addCriterionBtn' style='margin-left: auto;'>+</button>
          <!--<button id='categoryBtn_${categoryTitle}' class='editCategory' style='margin-left: auto;'>Edit</button>-->
        </div>
        <div class='criteria-buttons-container' style='display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;'></div>
      `
        contentDiv.appendChild(categoryDiv) // Append category to the main content

        // Get the container for the buttons
        let buttonsContainer = categoryDiv.querySelector('.criteria-buttons-container')

        // Sort criteria based on their Assessment
        const sortedCriteria = Object.keys(database[listName][category]).sort((a, b) => {
          const assessmentOrder = {
            'green': 1,
            'yellow': 2,
            'red': 3,
            '': 4 // For criteria without assessment (grey)
          }

          const aAssessment = (database[listName][category][a].Assessment || '').toLowerCase()
          const bAssessment = (database[listName][category][b].Assessment || '').toLowerCase()

          return (assessmentOrder[aAssessment] || 4) - (assessmentOrder[bAssessment] || 4)
        })

        // Add buttons for each sorted criterion under this category
        for (const criterionLabel of sortedCriteria) {
          const criterion = database[listName][category][criterionLabel]
          let button = document.createElement('button')
          button.classList.add('criteria-button')
          button.textContent = 'Ask ' + criterionLabel // Use the criterion label as button text

          // Set the default color for the button (light grey)
          button.style.backgroundColor = '#d3d3d3' // Default light grey
          button.style.border = '1px solid black' // Border for all buttons
          button.style.borderRadius = '4px'
          button.style.fontWeight = 'bold'
          button.style.cursor = 'pointer'

          // Conditional styling based on the presence of Assessment (green, yellow, red)
          if (criterion.Assessment) {
            switch (criterion.Assessment.toLowerCase()) {
              case 'green':
                button.style.backgroundColor = '#b2f2bb' // Pastel green
                break
              case 'yellow':
                button.style.backgroundColor = '#ffecb3' // Pastel yellow
                break
              case 'red':
                button.style.backgroundColor = '#ffccd5' // Pastel red
                break
              default:
                button.style.backgroundColor = '#d3d3d3' // Default grey if no match
            }
          }

          // Append each button to the buttons container
          buttonsContainer.appendChild(button)

          // Add right-click (contextmenu) functionality to the criterion button
          button.addEventListener('contextmenu', (event) => {
            this.showContextMenu(event, listName, category, criterion, criterionLabel)
          })

          // Add click event to display the criterion details (Description, Assessment, Effort Value)
          button.addEventListener('click', () => {
            CriterionActions.askCriterionAssessment(criterionLabel, criterion.Description)
          })
        }

        // Handle the '+' button for adding new criteria
        let addCriterionBtn = categoryDiv.querySelector('.addCriterionBtn')
        addCriterionBtn.addEventListener('click', () => {
          this.addNewCriterion(listName, category)
        })

        /* let editCategoryBtn = categoryDiv.querySelector('#categoryBtn_' + categoryTitle)
        // Add right-click (contextmenu) functionality to the criterion button
        editCategoryBtn.addEventListener('click', (event) => {
          this.editCategory(listName, category)
        }) */
      }
    }
  }

  // Function to handle criterion editing
  editCategory (listName, category) {
    let newCategory
    Alerts.threeOptionsAlert({
      title: 'Modifying name for category ' + category,
      html: '<div>' +
        '<input id="categoryName" class="swal2-input customizeInput" value="' + category + '"/>' +
        '</div>',
      preConfirm: () => {
        // Retrieve values from inputs
        newCategory = document.getElementById('categoryName').value
      },
      callback: () => {
        // Revise to execute only when OK button is pressed or criteria name and descriptions are not undefined
        if (!_.isUndefined(newCategory)) {
          window.promptex.storageManager.client.modifyCategory(listName, category, newCategory, () => {
            window.promptex._overleafManager._sidebar.remove()
          })
        }
      },
      denyButtonText: 'Delete',
      denyButtonColor: '#d33',
      denyCallback: () => {
        this.deleteCategory(listName, category, () => {
          window.promptex._overleafManager._sidebar.remove()
        })
      }
    })
  }

  // Function to handle criterion deletion
  deleteCategory (listName, category) {
    const confirmed = confirm(`Are you sure you want to delete '${category}'?`)
    if (confirmed) {
      window.promptex.storageManager.client.deleteCategory(listName, category, (err, message) => {
        if (err) {
          console.error('Failed to delete criterion:', err)
          alert('Failed to delete criterion')
        } else {
          // console.log('Criterion deleted successfully:', message)
          alert('Criterion deleted successfully')
          window.promptex._overleafManager._sidebar.remove()
        }
      })
    }
  }

  // New method to display criterion details
  showCriterionDetails (label, criterionElement) {
    let info = ''
    if (criterionElement && criterionElement.Assessment && criterionElement.AssessmentDescription) {
      const assessmentFace = Utils.getColoredFace(criterionElement.Assessment)
      info += '<b>Assessment</b> ' + assessmentFace + ': ' + criterionElement.AssessmentDescription + '<br><br>'
    }

    if (criterionElement && criterionElement.Suggestion) {
      info += '<b>Suggestion:</b> ' + criterionElement.Suggestion + '<br><br>'

      if (criterionElement.EffortValue && criterionElement.EffortDescription) {
        const effortFace = Utils.getColoredFace(criterionElement.EffortValue)
        info += '<b>Effort</b> ' + effortFace + ': ' + criterionElement.EffortDescription
      }
    }
    if (criterionElement && criterionElement.Annotations) {
      // Create an HTML list of the found excerpts with improved styling
      const excerptList = criterionElement.Annotations
        .map(excerpt => `<li style="margin-bottom: 8px; line-height: 1.5;">${excerpt}</li>`)
        .join('')
      info += `<h4>Excerpts:</h4><ul style="padding-left: 20px; list-style-type: disc;">${excerptList}</ul>`
    }
    // Show alert with the tooltip message
    Alerts.infoAnswerAlert({ title: 'Criterion Information', text: info })
  }

  // Function to show the context menu
  showContextMenu (event, listName, category, criterion, criterionLabel) {
    // Prevent the default context menu
    event.preventDefault()

    // Remove any existing context menu
    const existingMenu = document.getElementById('contextMenu')
    if (existingMenu) {
      existingMenu.remove()
    }

    // Create the context menu
    const menu = document.createElement('div')
    menu.id = 'contextMenu'
    menu.style.position = 'absolute'
    menu.style.top = `${event.clientY}px`
    menu.style.left = `${event.clientX}px`
    menu.style.backgroundColor = '#fff'
    menu.style.border = '1px solid #ccc'
    menu.style.padding = '10px'
    menu.style.zIndex = '9999'
    menu.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.2)'
    menu.innerHTML = `
    <ul style='list-style-type: none; padding: 0; margin: 0;'>
      <li style='padding: 5px 10px; cursor: pointer;' id='seeAnswer'>See Details</li>
      <li style='padding: 5px 10px; cursor: pointer;' id='editCriterion'>Edit</li>
    </ul>
  `

    document.body.appendChild(menu)

    // Add event listeners for context menu options
    document.getElementById('seeAnswer').addEventListener('click', () => {
      // alert(`Assessing: ${criterion}`)
      // CriterionActions.askCriterionAssessment(criterionLabel, criterion.Description)
      this.showCriterionDetails(criterionLabel, criterion)
      menu.remove() // Remove menu after selection
    })

    document.getElementById('editCriterion').addEventListener('click', () => {
      this.editCriterion(listName, category, criterion, criterionLabel)
      menu.remove() // Remove menu after selection
    })

    // Close the context menu if clicked outside
    document.addEventListener('click', () => {
      if (menu) {
        menu.remove()
      }
    }, { once: true })
  }

  // Function to handle criterion editing
  editCriterion (listName, category, criterion, criterionLabel) {
    let newCriterionLabel
    let criteriaDescription = criterion.Description
    Alerts.threeOptionsAlert({
      title: 'Modifying name and description for criterion ' + criterionLabel,
      html: '<div>' +
        'Name: <input id="criteriaName" class="swal2-input customizeInput" value="' + criterionLabel + '"/>' +
        '</div>' +
        '<div>' +
        'Description: <textarea id="criteriaDescription" class="swal2-input customizeInput" placeholder="Description">' + criteriaDescription + '</textarea>' +
        '</div>',
      preConfirm: () => {
        // Retrieve values from inputs
        newCriterionLabel = document.getElementById('criteriaName').value
        criteriaDescription = document.getElementById('criteriaDescription').value
      },
      callback: () => {
        // Revise to execute only when OK button is pressed or criteria name and descriptions are not undefined
        if (!_.isUndefined(criterionLabel) && !_.isUndefined(criteriaDescription)) {
          window.promptex.storageManager.client.modifyCriterion(listName, newCriterionLabel, category, criterionLabel, criteriaDescription)
            .then(() => {
              window.promptex._overleafManager._sidebar.remove()
            })
        }
      },
      denyButtonText: 'Delete',
      denyButtonColor: '#d33',
      denyCallback: () => {
        this.deleteCriterion(listName, category, criterionLabel)
      }
    })
  }

  // Function to handle criterion deletion
  deleteCriterion (listName, category, criterionLabel) {
    window.promptex._overleafManager._sidebar.remove()
    const confirmed = confirm(`Are you sure you want to delete '${criterionLabel}'?`)
    if (confirmed) {
      window.promptex.storageManager.client.deleteCriterion(listName, category, criterionLabel, (err, message) => {
        if (err) {
          console.error('Failed to delete criterion:', err)
          alert('Failed to delete criterion')
        } else {
          // console.log('Criterion deleted successfully:', message)
          alert('Criterion deleted successfully')
        }
      })
    }
  }

  // Function to add a new category to the selected criteria list
  addNewCategory () {
    let selectedList = document.getElementById('criteriaSelector').value // The selected list (e.g., Engineering Research, Action Research)
    let newCategoryName = prompt('Enter the name of the new category:')

    if (newCategoryName) {
      // Call CriteriaDatabaseClient to add the new category
      window.promptex.storageManager.client.addCategoryToCriteriaList(selectedList, newCategoryName)
        .then(() => {
          alert('Category added successfully')
        })
        .catch(err => {
          console.error('Failed to add category:', err)
          alert('Failed to add category')
        })
    }
  }

  // Function to add a new criterion to a category
  addNewCriterion (listName, category) {
    let criteriaName
    let criteriaDescription
    Alerts.multipleInputAlert({
      title: 'Creating a new criterion for category ' + category,
      html: '<div>' +
        '<input id="criteriaName" class="swal2-input customizeInput" placeholder="Type your criterion name..."/>' +
        '</div>' +
        '<div>' +
        '<textarea id="criteriaDescription" class="swal2-input customizeInput" placeholder="Type your criteria description..."></textarea>' +
        '</div>',
      preConfirm: () => {
        // Retrieve values from inputs
        criteriaName = document.getElementById('criteriaName').value
        criteriaDescription = document.getElementById('criteriaDescription').value
        // Find if criteria name already exists
        let criteriaExists = false
        if (criteriaExists) {
          const swal = require('sweetalert2')
          swal.showValidationMessage('A criteria with that name already exists.')
        }
      },
      callback: (err) => {
        if (err) {
          Alerts.infoAlert({ text: 'Unable to create this custom criteria, try it again.' })
        } else {
          // Check if not selected cancel or esc
          if (criteriaName) {
            window.promptex.storageManager.client.createCriterion(listName, category, criteriaName, criteriaDescription, () => {
              if (err) {
                console.error('Failed to create criterion:', err)
                alert('Failed to create criterion')
              } else {
                window.promptex._overleafManager._sidebar.remove()
              }
            })
          }
        }
      }
    })
  }

  createNewList () {
    const newListName = prompt('Enter the name of the new criteria list:')
    if (newListName) {
      window.promptex.storageManager.client.createCriteriaList(newListName, (error, message) => {
        if (error) {
          alert('Error: ' + error.message)
        } else {
          alert(message)
          // Update the dropdown to include the new list
          window.promptex._overleafManager._sidebar.remove()
        }
      })
    }
  }

  getProject () {
    // Get the current URL
    let currentURL = window.location.href

    // Use a regular expression to extract the project ID from the URL
    let projectID = currentURL.match(/project\/([a-zA-Z0-9]+)/)

    // If a project ID is found, return it; otherwise, return null
    if (projectID && projectID[1]) {
      return projectID[1] // projectID[1] contains the extracted project ID
    } else {
      console.error('Project ID not found in the URL')
      return null
    }
  }

  loadStorage (projectId, callback) {
    window.promptex.storageManager = new LocalStorageManager()
    window.promptex.storageManager.init(projectId, (err) => {
      if (err) {
        Alerts.errorAlert({
          text: 'Unable to initialize storage manager. Error: ' + err.message + '. ' +
            'Please reload webpage and try again.'
        })
      } else {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  // Method to check and update standardized value if needed
  checkAndUpdateStandardized (expectedStatus) {
    // Retrieve the standardized status
    if (this._standardized !== expectedStatus) {
      // Set the standardized status to the expectedStatus if the expected status is not met
      window.promptex.storageManager.client.setStandardizedStatus(this._project, expectedStatus, (setError, message) => {
        if (setError) {
          console.error('Error setting standardized status to false:', setError)
        } else {
          console.log('Standardized status updated successfully:', message)
          this._standardized = expectedStatus // Update the local value
        }
      })
    } else {
      console.log('Standardized status is already okay, no action needed.')
    }
    this.updateStandardizedButton()
  }
}

module.exports = OverleafManager
