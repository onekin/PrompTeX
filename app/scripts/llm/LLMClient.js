const _ = require('lodash')
const Alerts = require('../utils/Alerts')

class LLMClient {
  static async pdfBasedQuestion ({apiKey, documents, callback, prompt, llm}) {
    chrome.runtime.sendMessage({ scope: 'askLLM', cmd: llm, data: {documents: documents, apiKey: apiKey, query: prompt} }, function (response) {
      if (chrome.runtime.lastError) {
        Alerts.showErrorToast(`Unable to ask ${llm.modelType.charAt(0).toUpperCase() + llm.modelType.slice(1)}: ` + chrome.runtime.lastError.message)
      } else if (response.res.error) {
        Alerts.showErrorToast(`Unable to ask ${llm.modelType.charAt(0).toUpperCase() + llm.modelType.slice(1)}: ` + response.res.error)
      } else {
        const jsonString = response.res.text
        console.log('ANSWER: ' + jsonString)
        let retrievedJSON = jsonString.substring(jsonString.indexOf('{') + 1)
        let lastIndex = retrievedJSON.lastIndexOf('}')
        retrievedJSON = retrievedJSON.substring(0, lastIndex)
        retrievedJSON = retrievedJSON.replace(/(\r\n|\n|\r)/gm, '')
        if (!retrievedJSON.startsWith('{')) {
          retrievedJSON = '{' + retrievedJSON
        }
        if (!retrievedJSON.endsWith('}')) {
          retrievedJSON = retrievedJSON + '}'
        }
        try {
          const jsonObject = JSON.parse(retrievedJSON)
          if (_.isFunction(callback)) {
            callback(jsonObject)
          }
        } catch (err) {
          Alerts.showErrorToast('Please try again. Try to repeat the question. Provided answer has been: ' + retrievedJSON + '. Error: ' + err.message)
        }
      }
    })
  }

  static async simpleQuestion ({apiKey, callback, prompt, llm}) {
    chrome.runtime.sendMessage({ scope: 'askLLM', cmd: llm.modelType, data: {apiKey: apiKey, query: prompt, llm: llm} }, function (response) {
      if (chrome.runtime.lastError) {
        Alerts.showErrorToast(`Unable to ask ${llm.modelType.charAt(0).toUpperCase() + llm.modelType.slice(1)}: ` + chrome.runtime.lastError.message)
      } else if (response.res.error) {
        Alerts.showErrorToast(`Unable to ask ${llm.modelType.charAt(0).toUpperCase() + llm.modelType.slice(1)}: ` + response.res.error)
      } else {
        const jsonString = response.res
        console.log('ANSWER: ' + jsonString)
        let retrievedJSON = jsonString.substring(jsonString.indexOf('{') + 1)
        let lastIndex = retrievedJSON.lastIndexOf('}')
        retrievedJSON = retrievedJSON.substring(0, lastIndex)
        retrievedJSON = retrievedJSON.replace(/(\r\n|\n|\r)/gm, '')
        if (!retrievedJSON.startsWith('{')) {
          retrievedJSON = '{' + retrievedJSON
        }
        if (!retrievedJSON.endsWith('}')) {
          retrievedJSON = retrievedJSON + '}'
        }
        try {
          const jsonObject = JSON.parse(retrievedJSON)
          if (_.isFunction(callback)) {
            callback(jsonObject)
          }
        } catch (err) {
          Alerts.showErrorToast("The answer's JSON is not valid. Provided answer has been: " + retrievedJSON + '. Error: ' + err.message)
        }
      }
    })
  }
}

module.exports = LLMClient
