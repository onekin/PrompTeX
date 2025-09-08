const CriterionActions = require('./CriterionActions')
const OverleafUtils = require('./OverleafUtils')
const Alerts = require('../utils/Alerts')
const LocalStorageManager = require('../storage/LocalStorageManager')
const _ = require('lodash')
const LatexUtils = require('./LatexUtils')
const Config = require('../Config')

class OverleafManager {
  constructor () {
    this._project = null
    this._readingDocument = false
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
            const structureOrder = ['title', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']
            const regexMap = {
              title: /\\title\s*{/,
              section: /\\section\s*{/,
              subsection: /\\subsection\s*{/,
              subsubsection: /\\subsubsection\s*{/,
              paragraph: /\\paragraph\s*{/,
              subparagraph: /\\subparagraph\s*{/
            }

            // Find the first structure that appears in the selected text
            let firstMatchIndex = Infinity
            for (const key of structureOrder) {
              const match = selectedText.match(regexMap[key])
              if (match && match.index < firstMatchIndex) {
                scope = key
                firstMatchIndex = match.index
              }
            }

            // Fallback if no LaTeX structure is matched
            if (!scope) {
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
            if (scope === 'title') {
              numberOfExcerpts = 3
              scopedText = 'RESEARCH_PAPER: [' + LatexUtils.processTexDocument(documents) + ']'
              Alerts.closeLoadingWindow()
            } else if (scope === 'section' || scope === 'subsection' || scope === 'subsubsection' || scope === 'paragraph' || scope === 'subparagraph') {
              numberOfExcerpts = 2
              const sectionsArray = OverleafUtils.extractStructuralBlocks(scope, documents)
              console.log(sectionsArray)
              const sectionsFromText = this.extractBlockTitlesFromText(scope, selectedText)
              firstSection = sectionsFromText[0]
              const scopedSection = sectionsArray.find(section => section.title === firstSection)
              let blockContent = this.filterScopedContent(scopedSection.content.join('\n'), scope)
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
            const [roleKey, selectedRole] = Object.entries(Config.roles).find(([key, value]) => value.name === role)
            const roleDescription = await new Promise(resolve => {
              chrome.runtime.sendMessage({
                scope: 'definition',
                cmd: 'getDefinition',
                data: { type: roleKey }
              }, ({ definition }) => {
                resolve(definition || selectedRole.description)
              })
            })
            let prompt = Config.prompts.getFeedback
            prompt = prompt.replaceAll('[CONTENT]', scopedText)
            prompt = prompt.replaceAll('[ROLE]', roleDescription + ' ' + modeInstructions)
            prompt = prompt.replaceAll('[NUMBER]', numberOfExcerpts)
            prompt = prompt.replaceAll('[NOTE]', 'Please, do this task considering that: ' + humanNote)
            console.log(prompt)
            await CriterionActions.askForFeedback(documents, prompt, selectedRole.name, spaceMode, scopedText, roleDescription, modeInstructions, scope, firstSection, humanNote)
          }
        } else {
          console.log('Selection is outside the "panel-ide" element.')
        }
      }
    })
  }

  filterScopedContent (content, currentScope) {
    const levels = ['title', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']
    const currentLevelIndex = levels.indexOf(currentScope)

    if (currentLevelIndex === -1) return content

    const stopPatterns = levels
      .slice(0, currentLevelIndex + 1)
      .map(level => `\\\\${level}\\{`)
    const stopRegex = new RegExp(`^(${stopPatterns.join('|')})`)

    const lines = content.split('\n')
    const filteredLines = []

    for (let i = 0; i < lines.length; i++) {
      if (i > 0 && stopRegex.test(lines[i])) break
      filteredLines.push(lines[i])
    }

    return filteredLines.join('\n')
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

  extractBlockTitlesFromText (level, text) {
    const command = `\\\\${level}` // matches \\subsection
    const pattern = new RegExp(`${command}\\{(.*?)\\}`, 'g')
    const matches = [...text.matchAll(pattern)]
    return matches.map(match => match[1])
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

  monitorCodeEditorContentPromptex (elements) {
    if (!window.promptex._overleafManager._readingDocument) {
      elements.forEach((element) => {
        // if (!this.isSelectedInCodeEditor(element)) {
        if (element.textContent.trim().startsWith('%% PROMPTEX-COMMENT:')) {
          element.style.backgroundColor = '#FFD700'
        } else if (element.textContent.trim().startsWith('%% PROMPTEX-TIMESTAMP:')) {
          element.style.backgroundColor = '#ffb700'
        }
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

  addConfigurationButton () {
    // Locate the toolbar where the button should be added
    let toolbar = document.querySelector('.toolbar-right')
    if (!document.getElementById('checkCriteriaBtn')) {
      // Create the 'Check Criteria' button element
      let promptConfigurationBtn = document.createElement('div')
      promptConfigurationBtn.classList.add('toolbar-item')
      promptConfigurationBtn.innerHTML = `
      <button type='button' class='btn btn-full-height' id='checkCriteriaBtn'>
        <i class='fa fa-book fa-fw' aria-hidden='true'></i>
        <p class='toolbar-label'>Role definition</p>
      </button>
    `
      promptConfigurationBtn.addEventListener('click', async () => {
        // const content = await OverleafUtils.getAllEditorContent()
        promptConfigurationBtn.addEventListener('click', () => {
          window.open(chrome.runtime.getURL('/pages/promptConfiguration.html'), '_blank')
        })
      })

      // Insert the 'Check Criteria' button at the end of the toolbar list
      if (toolbar) {
        toolbar.appendChild(promptConfigurationBtn)
      } else {
        console.error('Toolbar not found')
      }
    }

    if (!document.querySelector('.mode-switch-container')) {
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
  }

  addOutlineButton () {
    // Check if the outline already exists
    if (document.querySelector('.newImprovementOutlinePane')) {
      return
    }

    const outlineContainer = document.querySelector('.outline-container')
    const newImprovementOutlinePane = document.createElement('div')
    newImprovementOutlinePane.classList.add('outline-pane2', 'newImprovementOutlinePane')

    const newImprovementHeader = document.createElement('header')
    newImprovementHeader.classList.add('outline-header', 'newImprovementHeader', 'closed')

    const headerImprovementButton = document.createElement('button')
    headerImprovementButton.classList.add('outline-header-expand-collapse-btn')
    headerImprovementButton.setAttribute('aria-label', 'Show Foundation outline')
    headerImprovementButton.setAttribute('aria-expanded', 'false')

    const caretImprovementIcon = document.createElement('span')
    caretImprovementIcon.classList.add('material-symbols', 'outline-caret-icon', 'improvement-caret-icon')
    caretImprovementIcon.setAttribute('aria-hidden', 'true')
    caretImprovementIcon.textContent = 'keyboard_arrow_right'

    const headerImprovementTitle = document.createElement('h4')
    headerImprovementTitle.classList.add('outline-header-name2')
    headerImprovementTitle.textContent = 'TODOs by section'

    headerImprovementButton.appendChild(caretImprovementIcon)
    headerImprovementButton.appendChild(headerImprovementTitle)
    newImprovementHeader.appendChild(headerImprovementButton)
    newImprovementOutlinePane.appendChild(newImprovementHeader)

    const originalOutline = document.querySelector('.outline-pane')
    outlineContainer.insertBefore(newImprovementOutlinePane, originalOutline)

    const outlinePanel = document.querySelector('#panel-outline')
    if (outlinePanel) {
      outlinePanel.style.height = '50%'
      outlinePanel.style.minHeight = '96px'
    }

    const outlinePanes = document.querySelectorAll('.outline-pane')
    outlinePanes.forEach(pane => {
      pane.style.height = '50%'
    })

    newImprovementHeader.addEventListener('click', (event) => {
      event.stopPropagation()
      const isHidden = newImprovementHeader.classList.contains('closed')

      if (isHidden) {
        newImprovementHeader.classList.replace('closed', 'opened')
        const outlineBody = document.createElement('div')
        outlineBody.classList.add('outline-body', 'newImprovementOutlineBody')

        const rootList = document.createElement('ul')
        rootList.classList.add('outline-item-list', 'outline-item-list-root')
        rootList.setAttribute('role', 'tree')
        outlineBody.appendChild(rootList)

        OverleafUtils.generateConsolidateOutlineContent(async (outlineContent) => {
          if (Object.keys(outlineContent).length === 0) {
            Alerts.infoAlert({ title: 'No sections with TODOs found', text: 'No annotation found in the document.' })
          } else {
            Object.keys(outlineContent).forEach((category) => {
              let cleanedValue, type
              let value = outlineContent[category]
              const match = value.match(/^(.*\(\d+\))(.+)$/)
              if (match) {
                cleanedValue = match[1].trim()
                type = match[2].trim()
              }

              let match2 = cleanedValue.match(/^(.+)\s\((\d+)\)$/)
              let numberOfTODOs = match2 ? match2[2] : ''

              const categoryLi = document.createElement('li')
              categoryLi.classList.add('outline-item')
              categoryLi.setAttribute('role', 'treeitem')
              categoryLi.setAttribute('aria-expanded', 'true')
              categoryLi.style.marginLeft = '5px'

              const categoryDiv = document.createElement('div')
              categoryDiv.classList.add('outline-item-row')

              const categoryTitle = document.createElement('button')
              categoryTitle.classList.add('outline-item-link')
              categoryTitle.setAttribute('data-navigation', '1')

              const categorySpan = document.createElement('span')
              categorySpan.style.paddingLeft = '20px'
              categorySpan.textContent = type === 'title' ? `Full Manuscript (${numberOfTODOs})` : cleanedValue

              categoryTitle.appendChild(categorySpan)
              categoryTitle.addEventListener('click', async () => {
                const match = cleanedValue.match(/^(.+)\s\((\d+)\)$/)
                if (match) {
                  let name = match[1]
                  let number = match[2]
                  let navigation = categoryTitle.getAttribute('data-navigation')

                  await OverleafUtils.scrollToConsolidateContent(name, parseInt(navigation), type)
                  categoryTitle.setAttribute('data-navigation', navigation === number ? '1' : (parseInt(navigation) + 1).toString())
                }
              })

              categoryDiv.appendChild(categoryTitle)
              categoryLi.appendChild(categoryDiv)
              rootList.appendChild(categoryLi)
            })
          }
        })

        newImprovementOutlinePane.appendChild(outlineBody)
      } else {
        newImprovementHeader.classList.replace('opened', 'closed')
        const outlineBody = newImprovementOutlinePane.querySelector('.outline-body')
        if (outlineBody) {
          newImprovementOutlinePane.removeChild(outlineBody)
        }
      }
      caretImprovementIcon.textContent = isHidden ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
    })
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
}

module.exports = OverleafManager
