const OverleafUtils = require('./OverleafUtils')
const Config = require('../Config')
const Alerts = require('../utils/Alerts')
const LLMClient = require('../llm/LLMClient')
const LatexUtils = require('./LatexUtils')

class CriterionActions {
  static async askCriterionAssessment (criterionLabel, description) {
    // Fetch document content
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }
    window.promptex._overleafManager._sidebar.remove()
    Alerts.showLoadingWindowDuringProcess('Reading document content...')
    const documents = await OverleafUtils.getAllEditorContent()
    const sectionsArray = OverleafUtils.extractSections(documents)
    console.log(sectionsArray)
    let prompt = Config.prompts.annotatePrompt
    prompt = prompt.replace('[C_NAME]', criterionLabel)
    prompt = prompt.replace('[C_DESCRIPTION]', description)
    prompt = 'RESEARCH PAPER: ' + LatexUtils.processTexDocument(documents) + '\n' + prompt
    Alerts.closeLoadingWindow()
    Alerts.showLoadingWindowDuringProcess('Retrieving API key...')
    chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
      if (llm === '') {
        llm = Config.review.defaultLLM
      }
      const llmProvider = llm.modelType
      Alerts.showLoadingWindowDuringProcess('Waiting ' + llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1) + ' to answer...')
      chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llmProvider }, ({ apiKey }) => {
        if (apiKey !== null && apiKey !== '') {
          let callback = (json) => {
            Alerts.closeLoadingWindow()
            console.log(json)
            const cleanExcerpts = json.claims.map(claim => {
              // Replace multiple backslashes with a single one
              let cleanedExcerpt = claim.excerpt.replace(/\\\\+/g, '\\')
              return cleanedExcerpt
            })
            console.log(cleanExcerpts)
            cleanExcerpts.forEach(excerpt => {
              if (documents.includes(excerpt)) {
                console.log(`Excerpt found: "${excerpt}"`)
              } else {
                console.log(`Excerpt not found: "${excerpt}"`)
              }
            })
            let suggestion = json.suggestionForImprovement
            let sentiment = json.sentiment
            let effortLevel = json.effortLevel
            let effortDescription = json.effortDescription
            let assessmentDescription = json.assessment
            // Call CriteriaDatabaseClient to update the criterion
            let listName = window.promptex._overleafManager._currentCriteriaList
            window.promptex.storageManager.client.updateCriterion(listName, criterionLabel, cleanExcerpts, suggestion, sentiment, effortLevel, effortDescription, assessmentDescription)
              .then(() => {
                console.log('Criterion updated successfully')
                let newContent = LatexUtils.addCommentsToLatex(documents, cleanExcerpts, suggestion, sentiment, criterionLabel)
                newContent = LatexUtils.ensurePromptexCommandExists(newContent)
                OverleafUtils.removeContent(() => {
                  window.promptex._overleafManager._sidebar.remove()
                  OverleafUtils.insertContent(newContent)
                  if (window.promptex._overleafManager._standardized) {
                    const projectId = window.promptex._overleafManager._project
                    window.promptex.storageManager.client.setStandarizedVersion(projectId, sectionsArray, (err, array) => {
                      if (err) {
                        console.error('Failed to set standarized version:', err)
                      } else {
                        console.log('Standarized version set successfully: ' + array)
                        window.promptex._overleafManager.checkAndUpdateStandardized(false)
                      }
                    })
                  }
                }).catch(err => {
                  console.error('Failed to update criterion:', err)
                  console.log('Failed to update criterion')
                })
              })
          }
          LLMClient.simpleQuestion({
            apiKey: apiKey,
            prompt: prompt,
            llm: llm,
            callback: callback
          })
        } else {
          Alerts.showErrorToast('No API key found for ' + llm)
        }
      })
    })
  }
}

module.exports = CriterionActions
