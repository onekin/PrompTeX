const _ = require('lodash')
const OverleafManager = require('./overleaf/OverleafManager')

class ContentScript {
  constructor () {
    this._overleafManager = new OverleafManager()
    // todo
  }

  init () {
    this._overleafManager.init()
  }
}

if (_.isEmpty(window.promptex)) {
  window.promptex = new ContentScript()
  window.promptex.init()
}
