const ChromeStorage = require('../utils/ChromeStorage')
const LocalStorageClient = require('./CriteriaDatabaseClient')
// const mockDatabase = require('./mockDatabase')
const DefaultSchemas = require('./DefaultSchemas')
const _ = require('lodash')

class LocalStorageManager {
  constructor () {
    this.client = null
    this.database = {} // Placeholder for criterion schema database
  }

  // Initialize the storage manager for a specific project and retrieve the database
  init (projectId, callback) {
    const storageKey = `db.${projectId}` // Unique storage key for each project
    ChromeStorage.getData(storageKey, ChromeStorage.local, (err, data) => {
      if (err) {
        callback(err)
      } else {
        if (_.isString(data)) {
          // Parse the retrieved data
          try {
            this.database = JSON.parse(data)
          } catch (e) {
            // If parsing fails, use the default schemas
            this.database.criterionSchemas = DefaultSchemas
            this.database.parameters = {}
            this.database.standarizedVersion = []
          } finally {
            this.client = new LocalStorageClient(this.database, this)
          }
        } else {
          // If no data exists, load default schemas
          this.database.criterionSchemas = DefaultSchemas
          this.database.parameters = {}
          this.database.standarizedVersion = []
          this.saveDatabase(projectId, this.database, () => {
            this.client = new LocalStorageClient(this.database, this)
            callback()
          })
        }
        // Save the default schema if the database is empty
        if (_.isEmpty(this.database)) {
          this.database.criterionSchemas = DefaultSchemas
          this.database.parameters = {}
          this.database.standarizedVersion = []
          this.saveDatabase(projectId, this.database, () => {
            this.client = new LocalStorageClient(this.database, this)
            callback()
          })
        } else {
          // Callback to signal completion
          callback()
        }
      }
    })
  }

  // Save the criterion schema database for a specific project
  saveDatabase (projectId, database, callback) {
    const storageKey = `db.${projectId}` // Unique storage key for each project
    let stringifiedDatabase = JSON.stringify(database)
    ChromeStorage.setData(storageKey, stringifiedDatabase, ChromeStorage.local, (err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, database)
        }
      }
    })
  }

  // Clean the criterion schema database for a specific project (reset to default)
  cleanDatabase (projectId, callback) {
    const storageKey = `db.${projectId}` // Unique storage key for each project
    ChromeStorage.setData(storageKey, 1, ChromeStorage.local, (err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      }
    })
  }
}

module.exports = LocalStorageManager
