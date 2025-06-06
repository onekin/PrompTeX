const Utils = require('../utils/Utils')

class LatexUtils {
  static ensureHumanNoteCommandExists (latexText) {
    // Define the new command string
    const promtexCommand = '\\newcommand{\\humanNote}[2]{#2}'
    const beginDoc = '\\begin{document}'

    // Check if the command already exists in the text
    if (!latexText.includes(promtexCommand)) {
      // Split the text into lines
      const lines = latexText.split('\n')

      // Find the line with \begin{document}
      const docIndex = lines.findIndex(line => line.includes(beginDoc))

      if (docIndex !== -1) {
        // Insert the new command just before \begin{document}
        lines.splice(docIndex, 0, promtexCommand)
      } else {
        console.warn('No \\begin{document} found in the LaTeX text.')
      }

      // Join the lines back into a single string
      latexText = lines.join('\n')
    }

    return latexText
  }

  static addCommentsToLatex (originalLatex, excerpts, suggestion, sentiment, criterionLabel) {
    let sentimentColor = Utils.sentimentToNumber(sentiment.toLowerCase())
    excerpts.forEach(excerpt => {
      let commentCommand = `\n\\promptex{\\textit{${criterionLabel}::${sentimentColor}}}{${excerpt}}\n`
      // Add the \mycomment after each occurrence of the excerpt in the latex file
      originalLatex = originalLatex.replace(excerpt, `${commentCommand}`)
    })
    return originalLatex
  }

  static addCommentsToLatexRoles (originalLatex, excerpts, sentiment, role, feedback, id) {
    let sentimentColor = Utils.sentimentToNumber(sentiment.toLowerCase())
    excerpts.forEach(excerpt => {
      let commentCommand = `\n\\promptex{\\textit{${role}::${sentimentColor}::${id}}{${excerpt}}\n`
      // Add the \mycomment after each occurrence of the excerpt in the latex file
      originalLatex = originalLatex.replace(excerpt, `${commentCommand}`)
    })
    return originalLatex
  }

  static generateId () {
    return Math.random().toString(36).substr(2, 6).toUpperCase()
  }

  static removeCommentsFromLatex (originalLatex) {
    // Define a regex to match \promptex{first}{second}, capturing the second parameter content
    const commentRegex = /\\promptex\{.*?\}\{(.*?)\}/gs

    // Apply the regex recursively to remove all \promptex commands
    let cleanedLatex = originalLatex
    let previousLatex

    // Keep applying the regex until no more matches are found (handles nested cases)
    do {
      previousLatex = cleanedLatex
      cleanedLatex = cleanedLatex.replace(commentRegex, '$1')
    } while (cleanedLatex !== previousLatex)

    // Return the cleaned LaTeX content
    return cleanedLatex.trim()
  }

  static processTexDocument (documents) {
    // Split the content into lines
    let lines = documents.split('\n')

    // Remove lines starting with '%'
    lines = lines.filter(line => !line.trim().startsWith('%'))
    lines = lines.filter(line => !line.trim().startsWith('\\section{'))
    lines = lines.filter(line => !line.trim().startsWith('\\subsection{'))
    lines = lines.filter(line => !line.trim().startsWith('\\subsubsection{'))
    lines = lines.filter(line => !line.trim().startsWith('\\begin{figure}'))
    lines = lines.filter(line => !line.trim().startsWith('\\end{figure}'))
    lines = lines.filter(line => !line.trim().includes('\\promptex{'))

    // Join the lines back to form the document content without comments
    let processedContent = lines.join('\n')

    // Define regex for abstract, keywords, figures, and sections
    const abstractRegex = /\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/
    const keywordsRegex = /\\keywords[\s\S]*?(?=\\|$)/

    // Check for the presence of the keywords section
    const keywordsMatch = processedContent.match(keywordsRegex)
    const abstractMatch = processedContent.match(abstractRegex)

    if (keywordsMatch) {
      // If a keywords section is found, remove everything before and including it
      processedContent = processedContent.substring(keywordsMatch.index + keywordsMatch[0].length)
    } else if (abstractMatch) {
      // If an abstract is found and no keywords section, remove everything before and including the abstract section
      processedContent = processedContent.substring(abstractMatch.index + abstractMatch[0].length)
    }

    // Remove excessive newlines (keep at most one consecutive newline)
    processedContent = processedContent.replace(/\n\s*\n/g, '\n')

    // Return the processed content trimmed
    return processedContent.trim()
  }

  static generateDiff (sectionsArray, standardizedArray) {
    const diffResult = []

    // Create a map of standardized sections for quick lookup by title
    const standardizedMap = new Map()
    standardizedArray.forEach(section => {
      standardizedMap.set(section.title, section.content)
    })
    // Process each section in the changed array
    sectionsArray.forEach(changedSection => {
      const { title, content: changedContent } = changedSection
      const standardizedContent = standardizedMap.get(title)

      if (standardizedContent) {
        // Section exists in both changed and standardized versions
        const maintainedLines = changedContent.filter(line => standardizedContent.includes(line))
        const newLines = changedContent.filter(line => !standardizedContent.includes(line))
        const deletedLines = standardizedContent.filter(line => !changedContent.includes(line))
        diffResult.push({
          title,
          maintainedLines,
          newLines,
          deletedLines
        })
        // Remove the section from the map to track remaining standardized sections
        standardizedMap.delete(title)
      } else {
        // Section is new in the changed version
        diffResult.push({
          title,
          newSection: true,
          content: changedContent
        })
      }
    })

    // Any remaining sections in the standardized map are deleted sections
    standardizedMap.forEach((content, title) => {
      diffResult.push({
        title,
        deletedSection: true,
        content
      })
    })

    return diffResult
  }
}

module.exports = LatexUtils
