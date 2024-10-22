const Config = {
  review: {
    groupName: 'AnnotatorGPT',
    namespace: 'review',
    urlParamName: 'rag',
    defaultLLM: { modelType: 'openAI', model: 'gpt-4' },
    tags: { // Defined tags for the domain
      grouped: { // Grouped annotations
        group: 'criteria',
        subgroup: 'level',
        relation: 'isCriteriaOf'
      }
    }
  },
  prompts: {
    annotatePrompt: 'Research Paper Context: [The research paper is provided above as a LaTeX file]' +
      'Analyze the paper based on the specified criterion for evaluation.\n' +
      'Criterion Name: [C_NAME]\n' +
      'Criterion Description: [C_DESCRIPTION]\n' +
      'Your task is to assess the entire research paper and generate a structured JSON response.\n' +
      ' This JSON should contain up to short three excerpts from the paper that directly relate to the given criterion and must include evidence for your assessment.\n' +
      'You have to evaluate whether the criterion is met using one of the following labels:\n' +
      '- green: The paper meets the criterion.\n' +
      '- yellow: The paper partially meets the criterion.\n' +
      '- red: The paper does not meet the criterion.\n' +
      'Additionally, provide a suggestion for improvement, classifying it as "red," "yellow," or "green" based on the effort required for implementation (e.g., time, resource availability, subject access, or technical skills).\n' +
      'The format should be as follows:\n' +
      '{\n' +
        '"assessment": "[assessment off the criteria]",\n' +
        '"sentiment": "[based on one of these values: green/yellow/red]",\n' +
          '"suggestionForImprovement": "[Detail the suggested improvement]",\n' +
          '"effortLevel": "[Classify the effort level for the suggested improvement: green, yellow, red]",\n' +
          '"effortDescription": "[Provide a detailed explanation of the required effort]",\n' +
          '"claims": [\n' +
             '{\n' +
                '"excerpt": "[Include a relevant short text fragment from the latex file. IMPORTANT: Keep the original LaTeX text, including the latex commands in the excerpt, such as \\textit{}, \\cite{}]\n, or nested commands such as \\footnote{\\href{... Do not include text fragments that are inside a \\promptex command' +
              '},\n' +
              '{\n' +
                '"excerpt": "[Include a relevant short text fragment from the latex file. IMPORTANT: Keep the original LaTeX text, including the latex commands in the excerpt, such as \\textit{}, \\cite{}]\n, or nested commands such as \\footnote{\\href{... Do not include text fragments that are inside a \\promptex command' +
               '},\n' +
              '{\n' +
               '"excerpt": "[Include a relevant short text fragment from the latex file. IMPORTANT: Keep the original LaTeX text, including the latex commands in the excerpt, such as \\textit{}, \\cite{}]\n, or nested commands such as \\footnote{\\href{... Do not include text fragments that are inside a \\promptex command' +
              '},\n' +
              ']\n' +
            '}\n' +
      'Please remember to maintain the text of the excerpts as it is in the original latex file, it is very important for the evaluation process.'
  }
}

module.exports = Config
