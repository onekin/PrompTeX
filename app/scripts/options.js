const $ = require('jquery')
const _ = require('lodash')
window.$ = $

if (window.location.href.includes('pages/options.html')) {
  const defaultLLM = { modelType: 'openAI', model: 'gpt-4' }
  const openAIModels = [
    // Current GPT-4o family
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-2024-11-20', label: 'GPT-4o (Nov 2024)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },

    // Latest GPT-4.1 family (January 2025)
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },

    // O-series reasoning models
    { value: 'o3', label: 'o3 (Reasoning)' },
    { value: 'o3-pro', label: 'o3-pro (Advanced Reasoning)' },
    { value: 'o4-mini', label: 'o4-mini (Reasoning)' },
    { value: 'o4-mini-high', label: 'o4-mini-high (Enhanced Reasoning)' },

    // Research preview models
    { value: 'gpt-4.5', label: 'GPT-4.5 (Preview - Deprecated July 2025)' },

    // Image generation
    { value: 'gpt-image-1', label: 'GPT Image 1' },

    // Legacy models (still available but not recommended)
    { value: 'gpt-4', label: 'GPT-4 (Legacy)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Legacy)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' }
  ]

  const anthropicModels = [
    // Latest Claude 4 family (May 2025)
    { value: 'claude-4-opus-20250514', label: 'Claude 4 Opus' },
    { value: 'claude-4-sonnet-20250514', label: 'Claude 4 Sonnet' },

    // Claude 3.7 family (current generation before Claude 4)
    { value: 'claude-3-7-sonnet-20241022', label: 'Claude 3.7 Sonnet' },

    // Claude 3.5 family
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (New)' },
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet (Original)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },

    // Claude 3 family (legacy but still available)
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Legacy)' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Legacy)' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Legacy)' }
  ]

  const groqModels = [
    // Alibaba Cloud
    { value: 'qwen-qwq-32b', label: 'Qwen QWQ 32B' },
    { value: 'qwen/qwen3-32b', label: 'Qwen3 32B' },

    // DeepSeek / Meta
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B' },

    // Google
    { value: 'gemma2-9b-it', label: 'Gemma2 9B IT' },

    // Groq
    { value: 'compound-beta', label: 'Compound Beta' },
    { value: 'compound-beta-mini', label: 'Compound Beta Mini' },

    // Hugging Face
    { value: 'distil-whisper-large-v3-en', label: 'Distil Whisper Large v3 EN' },

    // Meta
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama3-70b-8192', label: 'Llama3 70B 8192' },
    { value: 'llama3-8b-8192', label: 'Llama3 8B 8192' },
    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick 17B 128E Instruct' },
    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B 16E Instruct' },
    { value: 'meta-llama/llama-guard-4-12b', label: 'Llama Guard 4 12B' },
    { value: 'meta-llama/llama-prompt-guard-2-22m', label: 'Llama Prompt Guard 2 22M' },
    { value: 'meta-llama/llama-prompt-guard-2-86m', label: 'Llama Prompt Guard 2 86M' },

    // Mistral AI
    { value: 'mistral-saba-24b', label: 'Mistral Saba 24B' },

    // OpenAI
    { value: 'whisper-large-v3', label: 'Whisper Large v3' },
    { value: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo' },

    // PlayAI
    { value: 'playai-tts', label: 'PlayAI TTS' },
    { value: 'playai-tts-arabic', label: 'PlayAI TTS Arabic' }
  ]

  const geminiModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ]

  const LLMDropdown = document.getElementById('LLMDropdown')
  const modelSelectionContainer = document.getElementById('modelSelectionContainer')
  const modelDropdown = document.getElementById('modelDropdown')

  const openAIApiContainer = document.getElementById('openAI-ApiKeyContainer')
  const anthropicApiContainer = document.getElementById('anthropic-ApiKeyContainer')
  const groqApiContainer = document.getElementById('groq-ApiKeyContainer')
  const geminiApiContainer = document.getElementById('gemini-ApiKeyContainer')

  // Hide API key inputs initially
  openAIApiContainer.style.display = 'none'
  anthropicApiContainer.style.display = 'none'
  groqApiContainer.style.display = 'none'
  geminiApiContainer.style.display = 'none'

  // Handle LLM dropdown change
  document.querySelector('#LLMDropdown').addEventListener('change', (event) => {
    let selectedLLM = event.target.value
    resetModelDropdown()

    if (selectedLLM === 'openAI') {
      populateModelDropdown(openAIModels) // Populate the OpenAI models
    } else if (selectedLLM === 'anthropic') {
      populateModelDropdown(anthropicModels) // Populate the Anthropic models
    } else if (selectedLLM === 'groq') {
      populateModelDropdown(groqModels) // Populate the Groq models
    } else if (selectedLLM === 'gemini') {
      populateModelDropdown(geminiModels) // Populate the Gemini models
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
      groqApiContainer.style.display = 'none'
      geminiApiContainer.style.display = 'none'
      populateModelDropdown(openAIModels)
    } else if (selectedLLM === 'anthropic') {
      modelSelectionContainer.style.display = 'block'
      openAIApiContainer.style.display = 'none'
      anthropicApiContainer.style.display = 'block'
      groqApiContainer.style.display = 'none'
      geminiApiContainer.style.display = 'none'
      populateModelDropdown(anthropicModels)
    } else if (selectedLLM === 'groq') {
      modelSelectionContainer.style.display = 'block'
      openAIApiContainer.style.display = 'none'
      anthropicApiContainer.style.display = 'none'
      groqApiContainer.style.display = 'block'
      geminiApiContainer.style.display = 'none'
      populateModelDropdown(groqModels)
    } else if (selectedLLM === 'gemini') {
      modelSelectionContainer.style.display = 'block'
      openAIApiContainer.style.display = 'none'
      anthropicApiContainer.style.display = 'none'
      groqApiContainer.style.display = 'none'
      geminiApiContainer.style.display = 'block'
      populateModelDropdown(geminiModels)
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
