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
  roles: {
    validator: {
      name: 'Validate',
      description: 'Critically assess the ideas for accuracy, validity, and logical coherence. Evaluate the correctness of claims, consistency of arguments, and soundness of conclusions without suggesting improvements or changes.'
    },
    enhancer: {
      name: 'Enhance',
      description: 'Let me know HOW can I  improve the research content or ideas from the text. '
    },
    gapFiller: {
      name: 'Gap Filling',
      description: 'Identify and address missing components in the research content. Ensure all key elements—such as context, supporting evidence, or logical steps—are fully developed without altering existing content.'
    },
    alternativeProvider: {
      name: 'Alternatives',
      description: 'Generate new theoretical perspectives, alternative interpretations of results, or different methodological approaches. Offer novel insights into the ideas.'
    },
    unityBuilder: {
      name: 'Unify',
      description: 'Ensure logical consistency and integration of research ideas. Strengthen the connection between hypotheses, methodology, results, and conclusions to create a cohesive and well-supported research narrative without modifying individual components'
    },
    validatorRhetorical: {
      name: 'ValidateRhetorical',
      description: 'Evaluate the effectiveness of language, tone, and structural clarity to ensure consistency and logical coherence without making changes'
    },
    enhancerRhetorical: {
      name: 'EnhanceRhetorical',
      description: 'Let me know HOW can I Refine language, tone, and structural flow for clarity, readability, and rhetorical effectiveness while preserving the intended message.'
    },
    gapFillerRhetorical: {
      name: 'Gap FillingRhetorical',
      description: 'Identify and fill rhetorical gaps, ensuring the argument or narrative is fully developed and persuasive without altering the core message'
    },
    alternativeProviderRhetorical: {
      name: 'AlternativesRhetorical',
      description: 'Suggest alternative rhetorical strategies, argumentation styles, or structural approaches without evaluating the original content.\''
    },
    unityBuilderRhetorical: {
      name: 'UnifyRhetorical',
      description: 'Improve the rhetorical flow by connecting ideas and arguments into a cohesive and persuasive whole without modifying individual components'
    }
  },
  actions: {
    concretize: {
      'name': 'Concretize',
      'description': 'Transform abstract concepts into tangible examples or precise definitions. Ensure that broad generalizations, specialized terminology, or vague claims are substantiated with concrete details. Provide specific cases, applications, or real-world instances that illustrate the claim in a clear and examinable manner.'
    },
    elaborate: {
      'name': 'Elaborate',
      'description': 'Expand on initial insights by providing greater depth, nuance, or breadth of explanation. Break down key points, offer additional perspectives, and explore underlying complexities to enrich the argument. Extend observations by discussing their implications, variations, or supporting details.'
    },
    deconstruct: {
      'name': 'Deconstruct',
      'description': 'Analyze complex ideas by breaking them down into their essential components. Identify distinct elements, compare relationships, and systematically examine each part to reveal underlying structures. Clarify broad assertions by separating them into detailed subpoints for a more precise and critical evaluation.'
    },
    contextualize: {
      'name': 'Contextualize',
      'description': 'Situate ideas within broader frameworks, alternative viewpoints, or disciplinary perspectives. Connect observations to historical, theoretical, or practical contexts to enhance understanding. Provide comparisons, contrasting perspectives, or situational relevance to demonstrate the significance of the claim in different scenarios.'
    },
    substantiate: {
      'name': 'Substantiate',
      'description': 'Support claims with appropriate evidence, reasoning, and validation. Justify assertions with credible data, logical arguments, or references to established research. Identify underlying assumptions, examine alternative explanations, and ensure that the provided reasoning is thorough and well-founded.'
    }
  },
  prompts: {
    getFeedback: '-[CONTENT]\n' +
      '-TASK: \n' +
      'Given the provided content, you have to act as an academic writer and provide feedback. ' +
      'You must perform the following TASK: [ROLE].\n' +
      'IMPORTANT TO CONSIDER: [NOTE]\n' +
      'You have to provide a list of maximum 4 suggestions for the writer based on the assigned TASK. ' +
      '-OUTPUT FORMAT:\n' +
      'You must provide the response in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "suggestions": [\n' +
      '    {\n' +
      '      "suggestion": "Provide a specific and actionable suggestion.",\n' +
      '    },\n' +
      '    {\n' +
      '      "suggestion": "Provide a specific and actionable suggestion.",\n' +
      '    },\n' +
      '    ... more suggestions if applicable\n' +
      '  ]\n' +
      '}\n' +
      'The number of suggestions should be 4 or less, but ensure the quality of suggestions not the quantity.',
    getSuggestionsFeedback: '-[CONTENT]\n' +
      'Given the provided content, you acted as an academic writer and you performed as [ROLE]. ' +
      'You provided a list of suggestions for the writer based on the role, and I have selected some of the that I want you to clarify. ' +
      'This are the suggestions: [SUGGESTIONS].\n' +
      'TASK: \n' +
      'Now, in order to clarify them, you have to [ACTION] on the suggestions provided. ' +
      '-OUTPUT FORMAT:\n' +
      'You must provide the response in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "suggestions": [\n' +
      '    {\n' +
      '      "suggestion": "Provide a specific and actionable suggestion.",\n' +
      '    },\n' +
      '    {\n' +
      '      "suggestion": "Provide a specific and actionable suggestion.",\n' +
      '    },\n' +
      '    ... more suggestions if applicable\n' +
      '  ]\n' +
      '}\n' +
      'Please, your new suggestions have to be based on the previous suggestions. but applying the action you were required'
  }
}

module.exports = Config
