import Config from './Config'

window.onload = () => {
  if (window.location.href.includes('pages/promptConfiguration.html')) {
    let promptConfiguration = new PromptConfiguration()
    promptConfiguration.init()
  }
}

class PromptConfiguration {
  init () {
    // Initialize each prompt configuration
    this.setupPrompt('annotatePrompt', this.checkAnnotatePrompt)
    this.setupPrompt('newSectionPrompt', this.checkGeneralPrompt)
    this.setupPrompt('deletedSectionPrompt', this.checkGeneralPrompt)
    this.setupPrompt('modifiedSectionPrompt', this.checkGeneralPrompt)
    this.setupPrompt('createTODOPrompt', this.checkGeneralPrompt)
  }

  setupPrompt (type, validateFunction) {
    // Extract the prompt from the config
    const fullPrompt = Config.prompts[type]
    const splitIndex = fullPrompt.indexOf('The format should be as follows (ensure no extra text is added before or after the JSON):')

    // Split the prompt into editable and static parts
    const editablePart = fullPrompt.substring(0, splitIndex)
    const staticPart = fullPrompt.substring(splitIndex)

    // Set up the textarea and static display div
    const promptTextArea = document.querySelector(`#${type}`)
    const staticPartDiv = document.querySelector(`#${type}Static`)

    // Set initial values for the editable and static parts
    promptTextArea.value = editablePart
    staticPartDiv.innerHTML = this.formatWithLineBreaks(staticPart)

    // Event listener for resetting to default
    document.querySelector(`#${type}Button`).addEventListener('click', () => {
      let messageLabel = document.querySelector(`#${type}Message`)
      promptTextArea.value = editablePart // Reset only the editable part
      this.setPrompt(type, editablePart + staticPart)
      messageLabel.innerHTML = 'Prompt reset to default.'
    })

    // Event listener for saving the prompt
    document.querySelector(`#${type}SaveButton`).addEventListener('click', () => {
      let updatedEditablePart = promptTextArea.value
      let messageLabel = document.querySelector(`#${type}Message`)

      // Validate the prompt
      if (validateFunction(updatedEditablePart)) {
        const newFullPrompt = updatedEditablePart + staticPart
        this.setPrompt(type, newFullPrompt)
        messageLabel.innerHTML = 'Prompt saved.'
      } else {
        messageLabel.innerHTML = 'Invalid prompt. Please include the necessary placeholders.'
      }
    })

    // Load existing saved prompt, if available
    chrome.runtime.sendMessage({
      scope: 'prompt',
      cmd: 'getPrompt',
      data: { type: type }
    }, ({ prompt }) => {
      if (prompt && prompt.includes('The format should be as follows:')) {
        const existingEditablePart = prompt.substring(0, prompt.indexOf('The format should be as follows:'))
        promptTextArea.value = existingEditablePart
      } else {
        promptTextArea.value = editablePart
        this.setPrompt(type, editablePart + staticPart)
      }
    })
  }

  setPrompt (type, prompt) {
    chrome.runtime.sendMessage({
      scope: 'prompt',
      cmd: 'setPrompt',
      data: {
        prompt: prompt,
        type: type
      }
    }, ({ prompt }) => {
      console.log('Prompt stored ' + prompt)
      let messageLabel = document.querySelector('#' + type + 'Message')
      messageLabel.innerHTML = 'Prompt saved'
    })
  }

  checkAnnotatePrompt (prompt) {
    return prompt.includes('[C_DESCRIPTION]') && prompt.includes('[C_NAME]')
  }

  checkGeneralPrompt (prompt) {
    // Add custom validation logic for other prompts if needed
    return prompt.length > 0 // Example: ensure it is not empty
  }

  formatWithLineBreaks (text) {
    return text.replace(/\n/g, '<br>')
  }
}

export default PromptConfiguration
