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
    this.setupDefinition('validator')
    this.setupDefinition('enhancer')
    this.setupDefinition('gapFiller')
    this.setupDefinition('alternativeProvider')
    this.setupDefinition('unityBuilder')
    this.setupDefinition('validatorRhetorical')
    this.setupDefinition('enhancerRhetorical')
    this.setupDefinition('gapFillerRhetorical')
    this.setupDefinition('alternativeProviderRhetorical')
    this.setupDefinition('unityBuilderRhetorical')
  }

  setupDefinition (type) {
    // Extract the prompt from the config
    const fullDescription = Config.roles[type].description

    // Set up the textarea and static display div
    const promptTextArea = document.querySelector(`#${type}`)

    // Set initial values for the editable and static parts
    promptTextArea.value = fullDescription

    // Event listener for resetting to default
    document.querySelector(`#${type}Button`).addEventListener('click', () => {
      let messageLabel = document.querySelector(`#${type}Message`)
      promptTextArea.value = fullDescription // Reset only the editable part
      this.setDefinition(type, fullDescription)
      messageLabel.innerHTML = 'Prompt reset to default.'
    })

    // Event listener for saving the prompt
    document.querySelector(`#${type}SaveButton`).addEventListener('click', () => {
      let updatedEditablePart = promptTextArea.value
      let messageLabel = document.querySelector(`#${type}Message`)

      // Validate the prompt
      const newFullPrompt = updatedEditablePart
      this.setDefinition(type, newFullPrompt)
      messageLabel.innerHTML = 'Definition saved.'
    })

    // Load existing saved prompt, if available
    chrome.runtime.sendMessage({
      scope: 'definition',
      cmd: 'getDefinition',
      data: { type: type }
    }, ({ definition }) => {
      if (definition) {
        promptTextArea.value = definition
      } else {
        this.setDefinition(type, definition)
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

  setDefinition (type, definition) {
    chrome.runtime.sendMessage({
      scope: 'definition',
      cmd: 'setDefinition',
      data: {
        definition: definition,
        type: type
      }
    }, ({ prompt }) => {
      console.log('definition stored ' + definition)
      let messageLabel = document.querySelector('#' + type + 'Message')
      messageLabel.innerHTML = 'Prompt saved'
    })
  }

  formatWithLineBreaks (text) {
    return text.replace(/\n/g, '<br>')
  }
}

export default PromptConfiguration
