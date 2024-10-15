class Utils {
  static hexToRgb (hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  static sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  // Helper function to darken a color
  static darkenColor (color, percentage) {
    let f = parseInt(color.slice(1), 16)
    let t = percentage < 0 ? 0 : 255
    let p = percentage < 0 ? percentage * -1 : percentage
    let R = f >> 16
    let G = (f >> 8) & 0x00FF
    let B = f & 0x0000FF
    return (
      '#' +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    )
  }
  static async performRequest (opts, reqOptions = {remainingAttempts: 4, attempt: 0}) {
    let that = this
    let url = opts.url
    let r = {
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }
    switch (opts.method) {
      case 'POST':
        // todo consider different content-types
        if (r.headers['Content-Type'] == null || r.headers['Content-Type'].includes('application/json')) {
          r['body'] = opts.params
        } else if (r.headers['Content-Type'].includes('application/x-www-form-urlencoded')) {
          let formBody = []
          for (let property in opts.params) {
            let encodedKey = encodeURIComponent(property)
            let encodedValue = encodeURIComponent(opts.params[property])
            formBody.push(encodedKey + '=' + encodedValue)
          }
          formBody = formBody.join('&')
          r['body'] = formBody
        }
        break
      case 'GET':
        url += '?' + new URLSearchParams(opts.params)
        break
      case 'DELETE':
        // DO NOTHING
        break
      case 'PATCH':
        r['body'] = opts.params
        break
      case 'PUT':
        // todo
        break
    }
    let response = await fetch(url, r)
    if (response.ok) {
      return response
    } else {
      // check error
      // if timeout error --> retry
      if (reqOptions.remainingAttempts > 0) {
        let interval = 500 * Math.pow(2, reqOptions.attempt) // make configurable
        await that.sleep(interval)
        reqOptions.remainingAttempts--
        reqOptions.attempt++
        return that.performRequest(opts, reqOptions)
      } else {
        let error = new Error('Request error')
        error.cause = { code: response.status }
        error.response = response
        return Promise.reject(error)
      }
    }
  }
  static sentimentToNumber (sentiment) {
    switch (sentiment) {
      case 'green':
        return 0
      case 'yellow':
        return 1
      case 'red':
        return 2
      default:
        return 1
    }
  }
  static extractNumbersFromClassNames (text) {
    // Regular expression to match the desired pattern
    const regex = /react-popover-trigger-mapeditor-popover-contextmenu-attachment-(\d+)/g
    let matches
    const numbers = []
    // Iterate over each match and extract the number
    while ((matches = regex.exec(text)) !== null) {
      numbers.push(matches[1]) // The first capturing group contains the number
    }
    return numbers
  }

  static findParentWithAttribute (element, attribute) {
    while (element) {
      // Check if the element has the attribute
      if (element.hasAttribute(attribute)) {
        return element
      }
      // Move up to the next parent element
      element = element.parentElement
    }
    // If the loop completes without returning, no matching parent was found
    return null
  }

  static findValuesEndingWithName (obj, suffix) {
    for (let key in obj) {
      if (key.endsWith(suffix)) {
        return obj[key] // Return the value of the key ending with 'name'
      }
    }
  }
}

module.exports = Utils
