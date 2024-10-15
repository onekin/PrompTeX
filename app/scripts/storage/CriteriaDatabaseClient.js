class CriteriaDatabaseClient {
  constructor (database, manager) {
    console.log('loaded database: ')
    console.log(database)
    this.projectDatabase = database
    this.manager = manager
  }
  // Retrieve a category (e.g., "Essential Attributes", "Desirable Attributes")
  getSchemas () {
    if (this.projectDatabase && this.projectDatabase.criterionSchemas) {
      return this.projectDatabase.criterionSchemas
    }
    throw new Error(`No database found`)
  }

  // Retrieve a category (e.g., "Essential Attributes", "Desirable Attributes")
  getCategory (schema, category) {
    if (this.projectDatabase.criterionSchemas[schema] && this.projectDatabase.criterionSchemas[schema][category]) {
      return this.projectDatabase.criterionSchemas[schema][category]
    }
    throw new Error(`Category "${category}" does not exist for research type "${schema}"`)
  }

  // Retrieve a specific criterion (e.g., "Artifact Detail")
  getCriterion (schema, category, criterionName) {
    const categoryData = this.getCategory(schema, category)
    if (categoryData[criterionName]) {
      return categoryData[criterionName]
    }
    throw new Error(`Criterion "${criterionName}" does not exist in category "${category}" for research type "${schema}"`)
  }

  findCriterion (criterionName) {
    // Iterate through the criteria database
    for (const list in window.promptex.storageManager.client.getSchemas()) {
      for (const category in window.promptex.storageManager.client.getSchemas()[list]) {
        for (const criterion in window.promptex.storageManager.client.getSchemas()[list][category]) {
          if (criterion.toLowerCase() === criterionName.toLowerCase()) {
            return window.promptex.storageManager.client.getSchemas()[list][category][criterion]
          }
        }
      }
    }
    return null
  }

  updateSchemas (project, newSchemas) {
    return new Promise((resolve, reject) => {
      try {
        // Merge or replace the existing schemas with the provided newSchemas
        this.database = { ...this.database, ...newSchemas }

        // Save the updated database
        this.manager.saveDatabase(project, this.database, (err) => {
          if (err) {
            return reject(err)
          } else {
            resolve('Schemas updated successfully.')
          }
        })
      } catch (err) {
        return reject(new Error('Failed to update schemas: ' + err.message))
      }
    })
  }

  findCriterionInSchema (schema, criterionName) {
    // Iterate through the criteria database
    for (const category in window.promptex.storageManager.client.getSchemas()[schema]) {
      for (const criterion in window.promptex.storageManager.client.getSchemas()[schema][category]) {
        if (criterion.toLowerCase() === criterionName.toLowerCase()) {
          return window.promptex.storageManager.client.getSchemas()[schema][category][criterion]
        }
      }
    }
    return null
  }

  // Add a new category to a criteria list (e.g., 'Engineering Research')
  addCategoryToCriteriaList (listName, categoryName) {
    let projectID = window.promptex._overleafManager._project
    return new Promise((resolve, reject) => {
      // Check if the list exists in the database
      if (!this.projectDatabase.criterionSchemas[listName]) {
        return reject(new Error(`Criteria list '${listName}' does not exist.`))
      }

      // Check if the category already exists
      if (this.projectDatabase.criterionSchemas[listName][categoryName]) {
        return reject(new Error(`Category '${categoryName}' already exists in '${listName}'.`))
      }

      // Add the new category
      this.projectDatabase.criterionSchemas[listName][categoryName] = {}

      // Save the updated database
      this.manager.saveDatabase(projectID, this.projectDatabase, (err) => {
        if (err) {
          return reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  // Update an existing criterion in a category
  updateCriterion (listName, criterionLabel, cleanExcerpts, suggestion, sentiment, effortLevel, effortDescription, assessmentDescription) {
    let projectID = window.promptex._overleafManager._project
    return new Promise((resolve, reject) => {
      // Check if the list exists
      if (!this.projectDatabase.criterionSchemas[listName]) {
        return reject(new Error(`Criteria list '${listName}' does not exist.`))
      }

      let criterion = this.findCriterionInSchema(listName, criterionLabel)

      // If criterion is not found, reject
      if (!criterion) {
        return reject(new Error(`Criterion '${criterionLabel}' does not exist in any category of '${listName}'.`))
      }

      // Update the criterion with the provided values
      criterion.Annotations = cleanExcerpts || criterion.Annotations // Update annotations if provided
      criterion.Suggestion = suggestion || criterion.Suggestion // Update suggestion if provided
      criterion.Assessment = sentiment || criterion.Assessment // Update assessment if provided
      criterion.EffortValue = effortLevel || criterion.EffortValue // Update effort level if provided
      criterion.EffortDescription = effortDescription || criterion.EffortDescription // Update effort description if provided
      criterion.AssessmentDescription = assessmentDescription || criterion.AssessmentDescription // Update assessment description if provided
      // Save the updated database
      this.manager.saveDatabase(projectID, this.projectDatabase, (err) => {
        if (err) {
          return reject(err)
        } else {
          resolve(`Criterion '${criterionLabel}' updated successfully.`)
        }
      })
    })
  }

  cleanCriterionValues (projectId) {
    return new Promise((resolve, reject) => {
      try {
        // Iterate over each schema in the criteria database
        const schemas = this.getSchemas()
        for (const schemaName in schemas) {
          const schema = schemas[schemaName]

          // Iterate over each category in the schema
          for (const categoryName in schema) {
            const category = schema[categoryName]

            // Iterate over each criterion in the category
            for (const criterionName in category) {
              const criterion = category[criterionName]

              // Clean the criterion values
              criterion.Annotations = []
              criterion.Suggestion = ''
              criterion.Assessment = null
              criterion.EffortValue = null
              criterion.EffortDescription = ''
              criterion.AssessmentDescription = ''
            }
          }
        }

        // Save the updated database
        this.manager.saveDatabase(projectId, this.projectDatabase, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve('All criterion values have been cleaned successfully.')
          }
        })
      } catch (error) {
        reject(new Error('Failed to clean criterion values: ' + error.message))
      }
    })
  }

  // Add a new criterion to an existing category with name and description
  addCriterionToCategory (listName, categoryName, criterionName, criterionDescription) {
    let projectID = window.promptex._overleafManager._project
    return new Promise((resolve, reject) => {
      // Check if the list exists
      if (!this.projectDatabase.criterionSchemas[listName]) {
        return reject(new Error(`Criteria list '${listName}' does not exist.`))
      }

      // Check if the category exists
      if (!this.projectDatabase.criterionSchemas[listName][categoryName]) {
        return reject(new Error(`Category '${categoryName}' does not exist in '${listName}'.`))
      }

      // Check if the criterion already exists
      if (this.projectDatabase.criterionSchemas[listName][categoryName][criterionName]) {
        return reject(new Error(`Criterion '${criterionName}' already exists in category '${categoryName}'.`))
      }

      // Add the new criterion with the given description
      this.projectDatabase.criterionSchemas[listName][categoryName][criterionName] = {
        'Description': criterionDescription,
        'Assessment': null,
        'EffortValue': null,
        'EffortDescription': null,
        'Annotations': []
      }

      // Save the updated database
      this.manager.saveDatabase(projectID, this.projectDatabase, (err) => {
        if (err) {
          return reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  // Retrieve all annotations for a specific criterion
  getAnnotations (schema, category, criterionName) {
    const criterion = this.getCriterion(schema, category, criterionName)
    return criterion.Annotations
  }

  // Get the 'standardized' status for a project from parameters
  getStandardizedStatus () {
    if (this.projectDatabase && this.projectDatabase.parameters) {
      if (this.projectDatabase.parameters.standardized === undefined) {
        return true
      } else {
        return this.projectDatabase.parameters.standardized
      }
    } else {
      return true
    }
  }

  // Get the 'standardized' version
  getStandardizedVersion () {
    if (this.projectDatabase && this.projectDatabase.standarizedVersion) {
      if (this.projectDatabase.standarizedVersion) {
        return this.projectDatabase.standarizedVersion
      }
    } else {
      return []
    }
  }

  // Get the 'standardized' status for a project from parameters
  setStandarizedVersion (projectId, sectionsArray, callback) {
    if (this.projectDatabase && this.projectDatabase.standarizedVersion) {
      console.log(this.projectDatabase)
      try {
        // Ensure the parameters object exists for the project
        if (!this.projectDatabase.standarizedVersion) {
          this.projectDatabase.standarizedVersion = []
        }
        if (!this.projectDatabase.standarizedVersion) {
          this.projectDatabase.standarizedVersion = []
        }

        // Update the standardized status
        this.projectDatabase.standarizedVersion = sectionsArray

        // Save the updated database
        this.manager.saveDatabase(projectId, this.projectDatabase, (err) => {
          if (err) {
            callback(err, null)
          } else {
            callback(null, sectionsArray)
          }
        })
      } catch (err) {
        callback(err, null)
      }
    }
  }

  // Set the 'standardized' status for a project in parameters
  setStandardizedStatus (projectId, status, callback) {
    console.log(this.projectDatabase)
    try {
      // Ensure the parameters object exists for the project
      if (!this.projectDatabase.parameters) {
        this.projectDatabase.parameters = {}
      }
      if (!this.projectDatabase.parameters) {
        this.projectDatabase.parameters = {}
      }

      // Update the standardized status
      this.projectDatabase.parameters.standardized = status

      // Save the updated database
      this.manager.saveDatabase(projectId, this.projectDatabase, (err) => {
        if (err) {
          callback(err, null)
        } else {
          callback(null, status)
        }
      })
    } catch (err) {
      callback(err, null)
    }
  }
}

module.exports = CriteriaDatabaseClient
