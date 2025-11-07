const { ChatOpenAI } = require('@langchain/openai')
const { ChatAnthropic } = require('@langchain/anthropic')
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai')
const { ChatGroq } = require('@langchain/groq')
const { PromptTemplate } = require('@langchain/core/prompts')
const ChromeStorage = require('../utils/ChromeStorage')
// const { Client } = require('langsmith')
// const { LangChainTracer } = require('langchain/callbacks')

class LLMManagerBackground {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'llm') {
        if (request.cmd === 'getSelectedLLM') {
          ChromeStorage.getData('llm.selected', ChromeStorage.local, (err, llm) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (llm) {
                let parsedLLM = JSON.parse(llm)
                sendResponse({ llm: parsedLLM || '' })
              } else {
                sendResponse({ llm: '' })
              }
            }
          })
        } else if (request.cmd === 'setSelectedLLM') {
          let selectedLLM = request.data.llm
          selectedLLM = JSON.stringify(selectedLLM)
          ChromeStorage.setData('llm.selected', selectedLLM, ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ llm: selectedLLM })
            }
          })
        } else if (request.cmd === 'getTokenUsage') {
          let model = request.data.model
          ChromeStorage.getData(model + '_tokens', ChromeStorage.local, (err, tokens) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (tokens) {
                sendResponse({ tokens: tokens || '' })
              } else {
                sendResponse({ tokens: '' })
              }
            }
          })
        } else if (request.cmd === 'getAPIKEY') {
          let llmKey = 'llm.' + request.data + 'key'
          ChromeStorage.getData(llmKey, ChromeStorage.local, (err, apiKey) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (apiKey) {
                let parsedKey = JSON.parse(apiKey)
                sendResponse({ apiKey: parsedKey || '' })
              } else {
                sendResponse({ apiKey: '' })
              }
            }
          })
        } else if (request.cmd === 'setAPIKEY') {
          let llm = 'llm.' + request.data.llm + 'key'
          let apiKey = request.data.apiKey
          apiKey = JSON.stringify(apiKey)
          ChromeStorage.setData(llm, apiKey, ChromeStorage.local, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ apiKey: apiKey })
            }
          })
        }
        return true
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'askLLM') {
        if (request.cmd === 'anthropic') {
          this.askLLMAnthropic(request).then(
            res => sendResponse({ res: res }),
            err => sendResponse({ err: err })
          )// Return the error inside the message handler
          return true // Return true inside the message handler
        } else if (request.cmd === 'openAI') {
          if (request.data.documents) {
            this.askLLMOpenAIWithDocuments(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          } else {
            this.askLLMOpenAI(request).then(
              res => sendResponse({ res: res }),
              err => sendResponse({ err: err })
            )// Return the error inside the message handler
          }
          return true // Return true inside the message handler
        } else if (request.cmd === 'gemini') {
          this.askLLMGemini(request).then(
            res => sendResponse({ res: res }),
            err => sendResponse({ err: err })
          )// Return the error inside the message handler
          return true // Return true inside the message handler
        } else if (request.cmd === 'groq') {
          this.askLLMGroq(request).then(
            res => sendResponse({ res: res }),
            err => sendResponse({ err: err })
          )// Return the error inside the message handler
          return true // Return true inside the message handler
        }
      }
    })
  }

  async askLLMOpenAI (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    // create model
    const modelName = request.data.llm.model
    const model = new ChatOpenAI({
      model: modelName,
      apiKey, // use this (works in modern @langchain/openai)
      useResponsesApi: true, // recommended for GPT-5
      // callbacks still work; handleLLMEnd fires after a generation finishes
      callbacks: [
        {
          handleLLMEnd: (output) => {
            // output contains generations + usage
            // e.g., output.llmOutput?.tokenUsage
            this.saveLLMUsage(output, modelName)
          }
        }
      ]
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 429')) {
        return { error: 'Incorrect API key provided.' + err.toString() }
      } else if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: 'An error has occurred trying first call.' }
      }
    })
  }

  async askLLMAnthropic (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const modelName = request.data.llm.model
    // create model
    const model = new ChatAnthropic({
      temperature: 0.2,
      anthropicApiKey: apiKey,
      modelName: modelName,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            this.saveLLMUsage(output, modelName)
          }
        }
      ]
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: err.toString() }
      }
    })
  }

  async askLLMGroq (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const modelName = request.data.llm.model
    // create model
    const model = new ChatGroq({
      temperature: 0.2,
      apiKey: apiKey,
      model: modelName,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            this.saveLLMUsage(output, modelName)
          }
        }
      ]
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: err.toString() }
      }
    })
  }

  async askLLMGemini (request) {
    const apiKey = request.data.apiKey
    const query = request.data.query
    const modelName = request.data.llm.model
    const model = new ChatGoogleGenerativeAI({
      temperature: 0.2,
      apiKey: apiKey,
      model: modelName,
      callbacks: [
        {
          handleLLMEnd: (output, runId, parentRunId, tags) => {
            this.saveLLMUsage(output, modelName)
          }
        }
      ]
    })

    const promptTemplate = PromptTemplate.fromTemplate(
      '{query}'
    )
    // Create QA chain
    const chain = promptTemplate.pipe(model)
    return chain.invoke({ query: query }).then(res => {
      return res.text // Return the result so it can be used in the next .then()
    }).catch(async err => {
      console.log(err.toString())
      if (err.toString().startsWith('Error: 401')) {
        return { error: 'Incorrect API key provided.' }
      } else {
        return { error: err.toString() }
      }
    })
  }

  saveLLMUsage (output, modelName) {
    let totalCompletionTokens = 0
    let totalPromptTokens = 0
    let totalExecutionTokens = 0
    const { completionTokens, promptTokens, totalTokens } = output.llmOutput?.tokenUsage || { completionTokens: 0, promptTokens: 0, totalTokens: 0 }

    totalCompletionTokens += completionTokens
    totalPromptTokens += promptTokens
    totalExecutionTokens += totalTokens

    console.log(`Total completion tokens: ${totalCompletionTokens}`)
    console.log(`Total prompt tokens: ${totalPromptTokens}`)
    console.log(`Total execution tokens: ${totalExecutionTokens}`)
    ChromeStorage.getData(modelName + '_tokens', ChromeStorage.local, (err, tokens) => {
      if (err) {
        console.log('Error retrieving tokens: ', err)
      } else {
        let updatedTokens
        if (tokens) {
          // let parsedTokens = JSON.parse(tokens)
          console.log('Parsed tokens: ', tokens)
          updatedTokens = {
            completionTokens: (tokens.completionTokens || 0) + totalCompletionTokens,
            promptTokens: (tokens.promptTokens || 0) + totalPromptTokens,
            totalTokens: (tokens.totalTokens || 0) + totalExecutionTokens
          }
        } else {
          console.log('No tokens found for model: ', modelName)
          updatedTokens = {
            completionTokens: totalCompletionTokens,
            promptTokens: totalPromptTokens,
            totalTokens: totalExecutionTokens
          }
        }
        ChromeStorage.setData(modelName + '_tokens', updatedTokens, ChromeStorage.local, (err) => {
          if (err) {
            console.log('Error updating tokens: ', err)
          } else {
            console.log('Tokens updated successfully: ', updatedTokens)
          }
        })
      }
    })
  }
}

module.exports = LLMManagerBackground // Use module.exports for CommonJS
