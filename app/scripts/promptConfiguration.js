import Config from './Config'

window.onload = () => {
  if (window.location.href.includes('pages/promptConfiguration.html')) {
    let promptConfiguration = new PromptConfiguration()
    promptConfiguration.init()
  }
}

class PromptConfiguration {
  init () {
    // Extract the prompt from the config
    const fullPrompt = Config.prompts.annotatePrompt
    const splitIndex = fullPrompt.indexOf('The format should be as follows:')

    // Split the prompt into editable and static parts
    const editablePart = fullPrompt.substring(0, splitIndex)
    const staticPart = fullPrompt.substring(splitIndex)

    // Set up the textarea and static display div
    const promptTextArea = document.querySelector('#annotatePrompt')
    const staticPartDiv = document.querySelector('#annotatePromptStatic')

    // Set initial values for the editable and static parts
    promptTextArea.value = editablePart
    staticPartDiv.innerHTML = this.formatWithLineBreaks(staticPart)

    // Event listener for resetting to default
    document.querySelector('#annotatePromptButton').addEventListener('click', () => {
      let messageLabel = document.querySelector('#annotatePromptMessage')
      promptTextArea.value = editablePart // Reset only the editable part
      this.setPrompt('annotatePrompt', editablePart + staticPart)
      messageLabel.innerHTML = 'Prompt reset to default.'
    })

    // Event listener for saving the prompt
    document.querySelector('#annotatePromptSaveButton').addEventListener('click', () => {
      let updatedEditablePart = promptTextArea.value
      let messageLabel = document.querySelector('#annotatePromptMessage')

      // Validate the prompt
      if (this.checkAnnotatePrompt(updatedEditablePart)) {
        const newFullPrompt = updatedEditablePart + staticPart
        this.setPrompt('annotatePrompt', newFullPrompt)
        messageLabel.innerHTML = 'Prompt saved.'
      } else {
        messageLabel.innerHTML = 'Invalid prompt. Please include [C_DESCRIPTION] and [C_NAME].'
      }
    })

    // Load existing saved prompt, if available
    chrome.runtime.sendMessage({
      scope: 'prompt',
      cmd: 'getPrompt',
      data: { type: 'annotatePrompt' }
    }, ({ prompt }) => {
      if (prompt && prompt.includes('The format should be as follows:')) {
        // Extract and display the editable part
        const existingEditablePart = prompt.substring(0, prompt.indexOf('The format should be as follows:'))
        promptTextArea.value = existingEditablePart
      } else {
        // Use the default if no prompt is found
        promptTextArea.value = editablePart
        this.setPrompt('annotatePrompt', editablePart + staticPart)
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

  formatWithLineBreaks (text) {
    return text.replace(/\n/g, '<br>')
  }
}

export default PromptConfiguration
