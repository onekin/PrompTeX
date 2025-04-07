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
            const selectedRole = Object.values(Config.roles).find(el => el.name === role)
            let roleDescription = selectedRole.description
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

  extractSectionsFromText (text) {
    const sectionPattern = /\\section{(.*?)}/g // RegEx pattern to capture content inside \section{}
    const matches = [...text.matchAll(sectionPattern)] // Extract all matches
    return matches.map(match => match[1]) // Return only the content inside {}
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
