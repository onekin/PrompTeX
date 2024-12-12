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
      '-CONTEXT: \n' +
      'We are drafting a research paper using LaTeX. The current document represents the ongoing version of the manuscript. In line with the knowledge-transforming model of writing, the focus is on enhancing the content space, which includes the exploration of knowledge, problem analysis, and hypothesis formulation. This process aims to ensure that the manuscript effectively addresses specified criteria, reflecting rigor, coherence, and depth in its conceptual and empirical contributions. Your evaluation will involve assessing these content-specific dimensions, proposing actionable improvements, and analyzing the effort required for implementing these changes.\n' +
      '-TASK: \n' +
      'Given the context provided, assess the document based on the specified criterion below:\n' +
      'Criterion Name: [C_NAME]\n' +
      'Criterion Description: [C_DESCRIPTION]\n' +
      '\n' +
      'Your task is to:\n' +
      '\n' +
      'Identify Relevant Excerpts: Select up to three short excerpts from the document that directly relate to the criterion. Each excerpt must:\n' +
      '- Include the original LaTeX syntax (e.g., \\textit{}, \\cite{}, \\footnote{}) as written in the document.\n' +
      '- Serve as evidence for your assessment of how well the criterion is met.\n' +
      '\n' +
      'Evaluate the Criterion: Determine whether the document meets the criterion using one of the following labels:\n' +
      '- Green: The paper fully meets the criterion.\n' +
      '- Yellow: The paper partially meets the criterion.\n' +
      '- Red: The paper does not meet the criterion.\n' +
      '\n' +
      'Provide Suggestions for Improvement:\n' +
      '- Offer detailed, actionable suggestions to address gaps or improve the document’s alignment with the criterion.\n' +
      '- Classify the level of effort required for each suggestion as green (low effort), yellow (moderate effort), or red (high effort),\n' +
      'considering factors like time, resource availability, access to subjects, or technical skills.\n' +
      '- Provide a brief explanation for the effort classification.\n' +
      '-OUTPUT FORMAT:\n' +
      'You have to provide the answer in JSON format. The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "assessment": "[Provide an evaluation of how well the document meets the criterion. You can based your answer in the excerpts]",\n' +
      '  "sentiment": "[Use one of these values: green, yellow, red]",\n' +
      '  "suggestionForImprovement": "[Provide detailed, actionable suggestions to address gaps or improve the document’s alignment with the criterion]",\n' +
      '  "effortLevel": "[Classify the effort required for the suggested improvement: green (low), yellow (moderate), red (high)]",\n' +
      '  "effortDescription": "[Provide a detailed explanation of the required effort, considering time, resources, access, or technical skills]",\n' +
      '  "claims": [\n' +
      '    {\n' +
      '      "excerpt": "[Include a relevant short text fragment from the LaTeX file. IMPORTANT: Preserve the original LaTeX syntax, including commands such as \\textit{}, \\cite{}, and nested commands like \\footnote{\\href{...}. Avoid text inside \\promptex commands.]",\n' +
      '    },\n' +
      '    {\n' +
      '      "excerpt": "[Include another relevant short text fragment from the LaTeX file. IMPORTANT: Preserve the original LaTeX syntax, including commands such as \\textit{}, \\cite{}, and nested commands like \\footnote{\\href{...}. Avoid text inside \\promptex commands.]",\n' +
      '    },\n' +
      '    {\n' +
      '      "excerpt": "[Include another relevant short text fragment from the LaTeX file. IMPORTANT: Preserve the original LaTeX syntax, including commands such as \\textit{}, \\cite{}, and nested commands like \\footnote{\\href{...}. Avoid text inside \\promptex commands.]",\n' +
      '    }\n' +
      '  ]\n' +
      '}\n' +
      'Please remember to maintain the text of the excerpts as it is in the original latex file, it is very important for the evaluation process.',
    newSectionPrompt: 'RESEARCH PAPER: [The research paper is provided above as a LaTeX file]\n' +
      'CONTEXT: We are writing a research paper. I' +
      'This review will help ensure consistency, accuracy, and alignment with the overall objectives of the paper.' +
      'This changes can include changes in terminology, methodology, or content that may require adjustments in other sections of the paper.\n' +
      'DO: Act as the writer of a research paper. For the provided research paper, the section "[C_TITLE]" is new, and the content of this section is:\n' +
      '[C_NEWLINES]' + '\n' +
      'You need to review the rest of the research paper to evaluate how this new content affects other sections and ensure that it does not destabilize the overall manuscript. Your objective is to identify the adjustments necessary to integrate the implications of the new content and maintain consistency throughout the document.' +
      'Consider the section Title and if it is inside of other section, it can be relevant when considering changes in the manuscript.\n' +
      'TASKS:' +
      '1. **Identify Changes:** Spot the key changes introduced by the new section and evaluate their impact on terminology, structural decisions, or content in the rest of the manuscript.\n' +
      '2. **Ensure Narrative Accuracy:** Verify that the overall narrative of the document accurately reflects the improvements introduced by the new section.\n' +
      '3. **Types of Changes to Identify:**\n' +
      '   - **Terminology Enhancement:** Determine if the terminology has evolved (e.g., a change from "manuscript" to "annotated draft") and identify where these changes need to be propagated throughout the document.\n' +
      '   - **Methodology Adjustment:** Identify updates to methodology and evaluate how these changes impact other sections of the manuscript.\n' +
      '   - **Content Enrichment:** Identify new content added to the paper and evaluate where adjustments are needed to reflect and integrate this content.\n' +
      'Provide the answer in a JSON format with the following structure. ' +
      'The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      'comment: Summary of the main changes introduced by the new section,' +
      'identifiedChanges: {' +
      'TerminologyEnhancement: Provide a detailed review of terminology changes introduced in this section compared to the rest of the manuscript. Include any new or updated terminology.' +
      'MethodologyAdjustment: Detail the changes to methodology and their impact on other sections of the manuscript.,' +
      'ContentEnrichment: Detail new content added in this section and how it affects other sections.' +
      '},' +
      'affectedSpots: [List the sections or areas in the manuscript that need adjustments or review, with reasons for each. Provide each affected spot with this keys: affectedSection (Name of the affected section) and reason (Reason why this section is affected or needs adjustment). Analyze all this sections from the Research paper: [C_TITLES]]' +
      '}' +
      'Important: Only provide the JSON response, without any additional commentary.',
    deletedSectionPrompt: 'RESEARCH PAPER: [The research paper is provided above as a LaTeX file]' + '\n' +
      'CONTEXT: We are drafting a research paper and iterating through multiple versions. In the current iteration, the following section has been removed from the manuscript:\n' +
      '[C_TITLE]\n' +
      'The content of the deleted section was:\n' +
      '[C_DELETED_LINES]\n' +
      'It is important to review the impact of this deletion thoroughly, as it may introduce gaps or inconsistencies in the manuscript that need to be addressed to maintain coherence and alignment with the overall objectives of the paper.\n' +
      'DO: Act as the writer of a research paper. For the provided research paper, review the rest of the manuscript to evaluate how the removal of this section affects other sections. Your objective is to identify the adjustments necessary to ensure the remaining content integrates seamlessly and that the overall narrative remains stable and accurate.\n' +
      'Consider the section Title and if it is inside of other section, it can be relevant when considering changes in the manuscript.\n' +
      'TASKS:\n' +
      '1. **Identify Changes:** Spot the key gaps or inconsistencies introduced by the removal of the section and evaluate their impact on terminology, structural decisions, or content in the rest of the manuscript.\n' +
      '2. **Ensure Narrative Accuracy:** Verify that the overall narrative of the document reflects the implications of the deleted section and adjusts appropriately to maintain coherence.\n' +
      '3. **Types of Changes to Identify:**\n' +
      '   - **Terminology Enhancement:** Determine if the deletion affects terminology (e.g., if terms specific to the removed section are still used elsewhere) and identify where these need to be removed or updated throughout the document.\n' +
      '   - **Methodology Adjustment:** Identify if the removed section impacted methodology and evaluate where adjustments are needed to account for the removal.\n' +
      '   - **Content Enrichment:** Determine if the deletion creates gaps or missing information and suggest how to address these gaps to ensure the paper remains comprehensive and logical.\n' +
      'Provide the answer in a JSON format with the following structure:\n' +
      'comment: Summary of the main changes introduced by the removal of the section,\n' +
      'identifiedChanges: {\n' +
      'TerminologyEnhancement: Details of terminology changes and their impact on other sections.,\n' +
      'MethodologyAdjustment: Details of methodology changes and their impact on other sections.,\n' +
      'ContentEnrichment: Details of gaps created by the removal and how they can be addressed.\n' +
      '},\n' +
      'affectedSpots: [List the sections or areas in the manuscript that need adjustments or review, with reasons for each. Provide each affected spot with these keys: affectedSection (Name of the affected section) and reason (Reason why this section is affected or needs adjustment). Analyze all these sections from the Research Paper: [C_TITLES]]\n' +
      '}\n' +
      'Important: Only provide the JSON response, without any additional commentary.',
    modifiedSectionPrompt: 'RESEARCH PAPER: [The research paper is provided above as a LaTeX file]\n' +
      'CONTEXT: We are drafting a research paper and iterating through multiple versions. In the current iteration, the following section has been modified:\n' +
      '[C_TITLE]\n' +
      'The current content of this section is:\n' +
      '[C_COMBINED_CONTENT]\n' +
      'The changes made to this section are as follows:\n' +
      '- Added lines: [C_NEWLINES]\n' +
      '- Deleted lines: [C_DELETED_LINES]\n' +
      'It is important to review the impact of these modifications thoroughly, as they may introduce new content, changes, or inconsistencies that need to be reflected throughout the rest of the manuscript. This ensures consistency, accuracy, and alignment with the overall objectives of the paper.\n' +
      'DO: Act as the writer of a research paper. For the provided research paper, review the rest of the manuscript to evaluate how the modifications to this section affect other sections. Your objective is to identify the adjustments necessary to integrate the implications of these changes and maintain consistency throughout the document.\n' +
      'Consider the section Title and if it is inside of other section, it can be relevant when considering changes in the manuscript.\n' +
      'TASKS:\n' +
      '1. **Identify Changes:** Spot the key changes introduced by the modifications to this section and evaluate their impact on terminology, structural decisions, or content in the rest of the manuscript.\n' +
      '2. **Ensure Narrative Accuracy:** Verify that the overall narrative of the document reflects the implications of the modified section and adjusts appropriately to maintain coherence.\n' +
      '3. **Types of Changes to Identify:**\n' +
      '   - **Terminology Enhancement:** Determine if the modifications include changes to terminology (e.g., a change from "manuscript" to "annotated draft") and identify where these changes need to be propagated throughout the document.\n' +
      '   - **Methodology Adjustment:** Identify if the modifications affect the methodology and evaluate how these changes impact other sections of the manuscript.\n' +
      '   - **Content Enrichment:** Determine if the modifications introduce new content or remove key content, and suggest how to address any gaps or propagate changes as needed.\n' +
      'Provide the answer in a JSON format with the following structure:\n' +
      'comment: Summary of the main changes introduced by the modifications to the section,\n' +
      'identifiedChanges: {\n' +
      'TerminologyEnhancement: Details of terminology changes and their impact on other sections.,\n' +
      'MethodologyAdjustment: Details of methodology changes and their impact on other sections.,\n' +
      'ContentEnrichment: Details of new or removed content and how it affects other sections.\n' +
      '},\n' +
      'affectedSpots: [List the sections or areas in the manuscript that need adjustments or review, with reasons for each. Provide each affected spot with these keys: affectedSection (Name of the affected section) and reason (Reason why this section is affected or needs adjustment). Analyze all these sections from the Research Paper: [C_TITLES]]\n' +
      '}\n' +
      'Important: Only provide the JSON response, without any additional commentary.',
    createTODOPrompt: 'RESEARCH PAPER: [C_DOCUMENT]' + '\n' +
      'REVIEW: [C_REVIEW]\n' +
      'For the sections of the above RESEARCH PAPER, you have to provide a TODO list for the following sections: [C_TITLES]\n' +
      'You have to do that based on the complete REVIEW provided above: ' + '\n' +
      'Your task is to identify the tasks that need to be completed for each section based on the review of changes provided. The tasks should be specific and actionable, focusing on what needs to be done to address the modifications or additions in each section.\n' +
      'Each TODO must be explained in detail and provide substantial information.' +
      'For each section also include the comment of the changes made in the section from the Review, if it is available. For example, if there is a comment value for the section add it for that section in the output together. Not all sections are commented in the REVIEW\n' +
      'Provide the answer in a JSON format with the following structure. ' +
      'The format should be as follows (ensure no extra text is added before or after the JSON):\n' +
      '{\n' +
      '  "sections": [\n' +
      '    {\n' +
      '      "name": "[Section name]",\n' +
      '      "comment": "if the section is included in the REVIEW add the comment from it, if not put "There were not changes" \n' +
      '      "todo": "[List of tasks separated by commas]"\n' +
      '    },\n' +
      '    {\n' +
      '      "name": "[Another section name]",\n' +
      '      "comment": "if the section is included in the REVIEW add the comment from it, if not put "There were not changes"\n' +
      '      "todo": "[List of tasks separated by commas]"\n' +
      '    }\n' +
      '  ]\n' +
      '}\n' +
      'Important: Only provide the JSON response with at least two sections, and without any additional commentary or explanation.'
  }
}

module.exports = Config
