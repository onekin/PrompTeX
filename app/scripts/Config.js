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
    clarify: {
      name: 'Clarify',
      description: 'Provide a more detailed explanation of the suggestions given, ensuring that any ambiguous or unclear points are made explicit. Expand on any complex terms, vague statements, or assumptions to enhance the writer\'s understanding and allow for precise revisions.'
    },
    illustrate: {
      name: 'Illustrate',
      description: 'Offer a rationale for why each suggestion is relevant and necessary for improving the content. Explain the reasoning behind each suggestion, referencing academic writing standards, logical coherence, or stylistic principles to support the proposed changes.'
    },
    justify: {
      name: 'Justify',
      description: 'Provide concrete examples or scenarios to demonstrate how the suggested improvements can be applied effectively. Offer sample sentences, paragraph structures, or real-world analogies that help the writer visualize and implement the suggestions in context.'
    }
  },
  prompts: {
    getFeedback: '-[CONTENT]\n' +
      '-TASK: \n' +
      'Given the provided content, you have to act as an academic writer and provide feedback. ' +
      'You must perform the following TASK: [ROLE].\n' +
      'IMPORTANT TO CONSIDER: [NOTE]\n' +
      'You have to provide constructive feedback and a list of suggestions for the writer based on the assigned TASK. ' +
      '-OUTPUT FORMAT:\n' +
      'You must provide the response in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "feedback": "[Provide detailed feedback based on the provided content, referencing specific excerpts where necessary.]",\n' +
      '  "suggestions": [\n' +
      '    {\n' +
      '      "suggestion": "Provide a specific and actionable suggestion.",\n' +
      '    },\n' +
      '    ... more suggestions if applicable\n' +
      '  ]\n' +
      '}\n' +
      'The number of suggestions should be determined based on the depth of feedback required for the TASK, but ensure the quality of suggestions not the quantity.',
    getAnnotations: '-[CONTENT]\n' +
      '-TASK: \n' +
      'Given the provided, assess the document to provide feedback. [ROLE].\n' +
      '[NOTE]' +
      '\n' +
      'Identify Relevant Excerpts: Select up to [NUMBER] short excerpts from the document that directly relate to the task. Each excerpt must:\n' +
      '- Include the original LaTeX syntax (e.g., \\textit{}, \\cite{}, \\footnote{}) as written in the document.\n' +
      '- Serve as evidence for your assessment of how well the criterion is met.\n' +
      '\n' +
      'Determine whether the provided content meets the task asked to you using one of the following labels:\n' +
      '- Green: The content fully meets the task.\n' +
      '- Yellow: The content partially meets the task.\n' +
      '- Red: The content does not meet the task.\n' +
      '\n' +
      '-OUTPUT FORMAT:\n' +
      'You have to provide the answer in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "feedback": "[Provide your feedback. You can based your answer in the excerpts.]",\n' +
      '  "sentiment": "[Use one of these values: green, yellow, red]",\n' +
      '  "claims": [\n' +
      '    {\n' +
      '      "excerpt": "Include a relevant short text fragment from the LaTeX file. IMPORTANT: Preserve the original LaTeX syntax, including commands such as \\textit{}, \\cite{}, and nested commands like \\footnote{\\href{...}. Avoid text inside \\promptex commands.",\n' +
      '    },\n' +
      ' ... ' +
      '  ]\n' +
      '}\n' +
      'Please remember to maintain the text of the excerpts as it is in the original latex file, it is very important for the evaluation process. For the claims provide [NUMBER] excerpts in the array.',
    getSuggestionsFeedback: '-[CONTENT]\n' +
      'Given the provided content, you acted as an academic writer and you performed as [ROLE]. ' +
      'You provided a list of suggestions for the writer based on the role. ' +
      'You provided the following suggestions: [SUGGESTIONS].\n' +
      'TASK: \n' +
      'Now, you have to [ACTION] on the suggestions provided. ' +
      '-OUTPUT FORMAT:\n' +
      'You must provide the response in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "answer": "[Provide your answer.]",\n' +
      '}\n' +
      'Please only return one answer element in the JSON, if there are more comments for different suggestions, you can include them in the same answer element.'
  }
}

module.exports = Config
