const $ = require('jquery')
const _ = require('lodash')
window.$ = $

if (window.location.href.includes('pages/options.html')) {
  const defaultLLM = { modelType: 'openAI', model: 'gpt-4' }
  const openAIModels = [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-32k', label: 'GPT-4 32k' },
    { value: 'gpt-4-1106-preview', label: 'GPT-4-1106-Preview' }
  ]

  const anthropicModels = [
    { value: 'claude-v1', label: 'Claude v1' },
    { value: 'claude-v2', label: 'Claude v2' }
  ]

  const LLMDropdown = document.getElementById('LLMDropdown')
  const modelSelectionContainer = document.getElementById('modelSelectionContainer')
  const modelDropdown = document.getElementById('modelDropdown')

  const openAIApiContainer = document.getElementById('openAI-ApiKeyContainer')
  const anthropicApiContainer = document.getElementById('anthropic-ApiKeyContainer')

  // Hide OpenAI and Anthropic API key inputs initially
  openAIApiContainer.style.display = 'none'
  anthropicApiContainer.style.display = 'none'

  // Handle LLM dropdown change
  document.querySelector('#LLMDropdown').addEventListener('change', (event) => {
    let selectedLLM = event.target.value
    resetModelDropdown()

    if (selectedLLM === 'openAI') {
      populateModelDropdown(openAIModels) // Populate the OpenAI models
    } else if (selectedLLM === 'anthropic') {
      populateModelDropdown(anthropicModels) // Populate the Anthropic models
    }

    // Ensure the selectedModel is correctly set
    let selectedModel = modelDropdown.value
    if (!selectedModel && modelDropdown.options.length > 0) {
      selectedModel = modelDropdown.options[0].value // Fallback to the first model
    }

    // Set the LLM after the model dropdown has been updated
    setLLM(selectedLLM, selectedModel)
    handleLLMChange(selectedLLM)
  })

  // Handle model dropdown change
  document.querySelector('#modelDropdown').addEventListener('change', (event) => {
    const selectedLLM = LLMDropdown.value
    const selectedModel = event.target.value
    setLLM(selectedLLM, selectedModel) // Update LLM with new model
  })

  chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, ({ llm = defaultLLM }) => {
    document.querySelector('#LLMDropdown').value = llm.modelType || defaultLLM.modelType
    handleLLMChange(llm.modelType || defaultLLM.modelType) // Ensure the model dropdown gets populated
    modelDropdown.value = llm.model || defaultLLM.model
    setLLM(llm.modelType, llm.model)
  })

  // Update LLM (both provider and model)
  // eslint-disable-next-line no-inner-declarations
  function setLLM (llmProvider, model) {
    chrome.runtime.sendMessage({
      scope: 'llm',
      cmd: 'setSelectedLLM',
      data: { llm: { modelType: llmProvider, model: model } }
    }, ({ llm }) => {
      console.debug('LLM selected ' + llm)
    })
    console.log('Selected LLM Provider: ' + llmProvider + ' Model: ' + model)
  }

  // Handle changes in the LLM provider (like openAI or Anthropic)
  // eslint-disable-next-line no-inner-declarations
  function handleLLMChange (selectedLLM) {
    // Show/hide API Key inputs based on selected LLM
    if (selectedLLM === 'openAI') {
      modelSelectionContainer.style.display = 'block'
      openAIApiContainer.style.display = 'block'
      anthropicApiContainer.style.display = 'none'
      populateModelDropdown(openAIModels)
    } else if (selectedLLM === 'anthropic') {
      modelSelectionContainer.style.display = 'block'
      openAIApiContainer.style.display = 'none'
      anthropicApiContainer.style.display = 'block'
      populateModelDropdown(anthropicModels)
    } else {
      modelSelectionContainer.style.display = 'none'
      openAIApiContainer.style.display = 'none'
      anthropicApiContainer.style.display = 'none'
    }
    // Hide all storage configurations
    let APIKeyConfigurationCards = document.querySelectorAll('.APIKey-Configuration')
    APIKeyConfigurationCards.forEach((APIKeyConfigurationCard) => {
      APIKeyConfigurationCard.setAttribute('aria-hidden', 'true')
    })
    // Show corresponding selected LLM configuration card
    let selectedLLMConfiguration = document.querySelector('#' + selectedLLM + '-ApiKeyContainer')
    chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: selectedLLM }, ({ apiKey }) => {
      if (apiKey && apiKey !== '') {
        console.log('Retrieved API Key' + apiKey)
        let input = document.querySelector('#' + selectedLLM + '-APIKey')
        input.value = apiKey
        input.disabled = true
        let button = document.querySelector('#' + selectedLLM + '-APIKeyValidationButton')
        button.innerHTML = 'Change API Key value'
      } else {
        console.log('No retrieved API Key')
        document.querySelector('#' + selectedLLM + '-APIKey').value = ''
        document.querySelector('#' + selectedLLM + '-APIKey').placeholder = 'No API Key stored'
      }
    })
    if (_.isElement(selectedLLMConfiguration)) {
      selectedLLMConfiguration.setAttribute('aria-hidden', 'false')
    }
  }

  // eslint-disable-next-line no-inner-declarations
  function populateModelDropdown (models) {
    // Clear the dropdown before populating it
    modelDropdown.innerHTML = ''

    models.forEach(function (model) {
      const option = document.createElement('option')
      option.value = model.value
      option.textContent = model.label
      modelDropdown.appendChild(option)
    })
    // Set the first option as the default selection if there is no current selection
    if (modelDropdown.options.length > 0) {
      modelDropdown.value = modelDropdown.options[0].value
    }
  }

  // eslint-disable-next-line no-inner-declarations
  function resetModelDropdown () {
    modelDropdown.innerHTML = '' // Reset by clearing all previous options
  }

  // API Key saving functionality
  const validationButtons = document.getElementsByClassName('APIKeyValidationButton')
  Array.from(validationButtons).forEach(button => {
    button.addEventListener('click', () => {
      let selectedLLM = document.querySelector('#LLMDropdown').value
      let button = document.querySelector('#' + selectedLLM + '-APIKeyValidationButton')
      if (button.innerHTML === 'Change API Key value') {
        let input = document.querySelector('#' + selectedLLM + '-APIKey')
        input.disabled = false
        button.innerHTML = 'Save'
      } else {
        let apiKey = document.querySelector('#' + selectedLLM + '-APIKey').value
        if (selectedLLM && apiKey) {
          setAPIKey(selectedLLM, apiKey)
        }
      }
    })
  })

  // eslint-disable-next-line no-inner-declarations
  function setAPIKey (selectedLLM, apiKey) {
    chrome.runtime.sendMessage({
      scope: 'llm',
      cmd: 'setAPIKEY',
      data: { llm: selectedLLM, apiKey: apiKey }
    }, ({ apiKey }) => {
      console.log('APIKey stored ' + apiKey)
      let button = document.querySelector('#' + selectedLLM + '-APIKeyValidationButton')
      button.innerHTML = 'Change API Key value'
      let input = document.querySelector('#' + selectedLLM + '-APIKey')
      input.disabled = true
    })
  }
}
