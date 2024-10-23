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
      'Please remember to maintain the text of the excerpts as it is in the original latex file, it is very important for the evaluation process.',
    newSectionPrompt: 'RESEARCH PAPER: [C_DOCUMENT]\n' +
      'DO: Act as a writer of a research paper. For the above research paper, the section "[C_TITLE]" is new and the content in it is:\n' +
      '[C_NEWLINES]' + '\n' +
      'Please, you have to review the rest of the sections and how the new content in the rest of the research paper to not destabilize the overall manuscript.' +
      'In order to later adjust related content to integrate the implications of these changes and maintain consistency throughout,' +
      'you have to IDENTIFY the changes made during the improvement of the paper, SPOTTING where these adjustments impact the previous terminology, structural decisions, or content.' +
      'ensuring that the overall narrative of the document accurately represents the improvements made.' +
      'Changes can be Terminology Enhancement (i.e., Determine that the terminology has evolved, such as changing from "manuscript" to "annotated draft," making it necessary to propagate these changes of terminology in other sections\n' +
      ', Methodology adjustment (i.e., Identify that the methodology has been updated, requiring the adjustment of content where the changes of methodology can impact\n' +
      ', Content enrichment (i.e., Identify new content that has been added in the paper, and changes that will be required to be propagated\n' +
      'Provide the answer in a JSON format with the following structure: ' +
      'comment: Summary of the main changes introduced by the new section.,' +
      'identifiedChanges: {' +
      'TerminologyEnhancement: Details of terminology changes and their impact on other sections.,' +
      'MethodologyAdjustment: Details of methodology changes and their impact on other sections.,' +
      'ContentEnrichment: Details of new content and how it affects other sections.' +
      '},' +
      'affectedSpots: List the sections or areas in the manuscript that need adjustments or review, with reasons for each.' +
      '}' +
      'Important: Only provide the JSON response, without any additional commentary.',
    deletedSectionPrompt: 'RESEARCH PAPER: [C_DOCUMENT]' + '\n' +
      'DO: Act as a writer of a research paper. For the above research paper, the following section has been deleted:\n' +
      '[C_TITLE]' + '\n content was' + '[C_DELETED_LINES]' + '\n' +
      'Please, you have to review the rest of the sections and how the new content in the rest of the research paper to not destabilize the overall manuscript.' +
      'In order to later adjust related content to integrate the implications of these changes and maintain consistency throughout,' +
      'you have to IDENTIFY the changes made during the improvement of the paper, SPOTTING where these adjustments impact the previous terminology, structural decisions, or content.' +
      'ensuring that the overall narrative of the document accurately represents the improvements made.' +
      'Changes can be Terminology Enhancement (i.e., Determine that the terminology has evolved, such as changing from "manuscript" to "annotated draft," making it necessary to propagate these changes of terminology in other sections\n' +
      ', Methodology adjustment (i.e., Identify that the methodology has been updated, requiring the adjustment of content where the changes of methodology can impact\n' +
      ', Content enrichment (i.e., Identify new content that has been added in the paper, and changes that will be required to be propagated\n' +
      'Provide the answer in a JSON format with the following structure: ' +
      'comment: Summary of the main changes introduced by the new section.,' +
      'identifiedChanges: {' +
      'TerminologyEnhancement: Details of terminology changes and their impact on other sections.,' +
      'MethodologyAdjustment: Details of methodology changes and their impact on other sections.,' +
      'ContentEnrichment: Details of new content and how it affects other sections.' +
      '},' +
      'affectedSpots: List the sections or areas in the manuscript that need adjustments or review, with reasons for each.' +
      '}' +
      'Important: Only provide the JSON response, without any additional commentary.',
    modifiedSectionPrompt: 'RESEARCH PAPER: [C_DOCUMENT]' + '\n' +
      'DO: Act as a writer of a research paper. For the above research paper, the following section has been modified:\n' +
      '[C_TITLE]' + '\n the content is this [C_COMBINED_CONTENT]' + '\n' +
      'added lines were' + '[C_NEWLINES]' + '\n' + 'deleted lines were [C_DELETED_LINES]' + '\n' +
      'Please, you have to review the rest of the sections and how the new content in the rest of the research paper to not destabilize the overall manuscript.' +
      'In order to later adjust related content to integrate the implications of these changes and maintain consistency throughout,' +
      'you have to IDENTIFY the changes made during the improvement of the paper, SPOTTING where these adjustments impact the previous terminology, structural decisions, or content.' +
      'ensuring that the overall narrative of the document accurately represents the improvements made.' +
      'Changes can be Terminology Enhancement (i.e., Determine that the terminology has evolved, such as changing from "manuscript" to "annotated draft," making it necessary to propagate these changes of terminology in other sections\n' +
      ', Methodology adjustment (i.e., Identify that the methodology has been updated, requiring the adjustment of content where the changes of methodology can impact\n' +
      ', Content enrichment (i.e., Identify new content that has been added in the paper, and changes that will be required to be propagated\n' +
      'Provide the answer in a JSON format with the following structure: ' +
      'comment: Summary of the main changes introduced by the new section.,' +
      'identifiedChanges: {' +
      'TerminologyEnhancement: Details of terminology changes and their impact on other sections.,' +
      'MethodologyAdjustment: Details of methodology changes and their impact on other sections.,' +
      'ContentEnrichment: Details of new content and how it affects other sections.' +
      '},' +
      'affectedSpots: List the sections or areas in the manuscript that need adjustments or review, with reasons for each.' +
      '}' +
      'Important: Only provide the JSON response, without any additional commentary.'
  }
}

module.exports = Config
