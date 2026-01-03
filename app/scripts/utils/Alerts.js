
let swal = null
if (document && document.head) {
  swal = require('sweetalert2')
}
const _ = require('lodash')

class Alerts {
  static showErrorWindow (message) {
    swal.fire({
      icon: 'error',
      html: message
    })
  }

  static showErrorToast (message, destroyFunc) {
    swal.fire({
      icon: 'error',
      text: message,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      didDestroy: destroyFunc
    })
  }

  static inputTextAlert ({title, input = 'text', type, inputPlaceholder = '', inputValue = '', preConfirm, cancelCallback, showCancelButton = true, html = '', callback}) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        input: input,
        inputPlaceholder: inputPlaceholder,
        inputValue: inputValue,
        html: html,
        type: type,
        preConfirm: preConfirm,
        showCancelButton: showCancelButton
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        } else {
          if (_.isFunction(cancelCallback)) {
            cancelCallback()
          }
        }
      })
    }
  }

  static showAlertToast (message, destroyFunc) {
    swal.fire({
      icon: 'info',
      text: message,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      didDestroy: destroyFunc
    })
  }

  static showSuggestedAnswers (message, callback, destroyFunc) {
    swal.fire({
      icon: 'info',
      text: message,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: true,
      didDestroy: destroyFunc
    }).then((result) => {
      if (result.value) {
        if (_.isFunction(callback)) {
          callback(null, result.value)
        }
      }
    })
  }

  static showWarningWindow (message) {
    swal.fire({
      icon: 'warning',
      html: message
    })
  }

  static showToast (content) {
    swal.fire({
      icon: 'warning',
      toast: true,
      html: content,
      width: '500px',
      position: 'bottom-end',
      confirmButtonText: 'Close'
    })
  }

  static showOptionsToast (content) {
    swal.fire({
      icon: 'warning',
      toast: true,
      html: '<h1 style="font-size:30px">' + content + '</h1>',
      width: '500px',
      position: 'bottom-end',
      confirmButtonText: 'Close'
    })
  }

  static showLoadingWindow (content) {
    swal.fire({
      title: 'Loading',
      html: content,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      showCancelButton: false,
      customClass: 'custom-loading-toast',
      onBeforeOpen: () => {
        swal.showLoading()
      }
    })
  }

  static loadingTimer = null

  static showLoadingWindowDuringProcess (content) {
    // cancel any previous pending show
    if (Alerts.loadingTimer) {
      clearTimeout(Alerts.loadingTimer)
      Alerts.loadingTimer = null
    }

    // close any currently open popup
    if (swal.isVisible()) {
      swal.close()
    }

    Alerts.loadingTimer = setTimeout(() => {
      swal.fire({
        title: 'Loading',
        html: content,
        toast: true,
        position: 'center',
        showConfirmButton: false,
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: { popup: 'custom-loading-toast' },
        didOpen: () => swal.showLoading()
      })

      Alerts.loadingTimer = null
    }, 100)
  }

  static closeLoadingWindow () {
    // prevent a delayed "fire" from reopening it
    if (Alerts.loadingTimer) {
      clearTimeout(Alerts.loadingTimer)
      Alerts.loadingTimer = null
    }

    // close if visible (hideLoading is optional)
    if (swal.isVisible()) {
      swal.hideLoading()
      swal.close()
    }
  }

  static closeWindow () {
    swal.close()
  }

  static showNarrative ({text = chrome.i18n.getMessage('expectedInfoMessageNotFound'), title = 'Info', callback, confirmButtonText = 'OK', showCancelButton = true}) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        type: 'info',
        title: title,
        showCancelButton: showCancelButton,
        cancelButtonText: 'Copy',
        confirmButtonText: confirmButtonText,
        html: '<div style="text-align: justify;text-justify: inter-word" width=700px>' + text + '</div>',
        onBeforeOpen: () => {
          let element = document.querySelector('.swal2-popup')
          element.style.width = '800px'
          // Add event listeners to the buttons after they are rendered
        }
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            // callback(null, result.value)
          }
        } else {
          navigator.clipboard.writeText(text)
            .then(() => {
              console.log('Text copied to clipboard')
            })
            .catch(err => {
              console.error('Error in copying text: ', err)
            })
        }
      })
    }
  }

  static infoAlert ({
    text = chrome.i18n.getMessage('expectedInfoMessageNotFound'),
    callback,
    confirmButtonText = '',
    cancelButtonText = '',
    showCancelButton = false,
    showConfirmButton = false,
    customClass = {},
    didOpen = null // ✅ Allow passing `didOpen`
  }) {
    Alerts.tryToLoadSwal()

    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        showCancelButton: showCancelButton,
        showConfirmButton: showConfirmButton,
        confirmButtonText: confirmButtonText || '',
        cancelButtonText: cancelButtonText || '',
        showCloseButton: true,
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: false,
        customClass: {
          confirmButton: customClass.confirmButton || '',
          cancelButton: customClass.cancelButton || '',
          popup: customClass.popup || ''
        },
        html: text,
        didOpen: (popup) => { // ✅ Ensure we get the popup element correctly
          popup.style.width = '800px'

          // Make the text smaller and justified
          const content = popup.querySelector('.swal2-html-container')
          if (content) {
            content.style.fontSize = '0.8em'
          }

          // ✅ If `didOpen` is provided, execute it
          if (_.isFunction(didOpen)) {
            didOpen(popup)
          }
        }
      }).then((result) => {
        if (result.isConfirmed && _.isFunction(callback)) {
          callback(null, result.value)
        }
      })
    }
  }

  static multipleInputAlert ({title = 'Input', html = '', preConfirm, showCancelButton = true, callback, allowOutsideClick = true}) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        html: html,
        focusConfirm: false,
        preConfirm: preConfirm,
        showCancelButton: showCancelButton,
        allowOutsideClick: allowOutsideClick
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        }
      })
    }
  }

  static askUserNumberOfClusters (number, callback) {
    let showForm = () => {
      // Create form
      let numberInput = Math.floor(number / 2)
      let html = ''
      html += '<label for="numberInput">Enter a number (less than ' + number + '): </label>'
      html += '<input type="number" id="numberInput" name="numberInput" value="' + numberInput + '" min="1" max="' + (number - 1) + '" ><br>'
      Alerts.multipleInputAlert({
        title: 'How many nodes do you want to cluster?',
        html: html,
        // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
        preConfirm: () => {
          numberInput = document.querySelector('#numberInput').value
        },
        showCancelButton: true,
        allowOutsideClick: false,
        callback: (err) => {
          if (err) {
            callback(new Error('Unable to read json file: ' + err.message))
          } else {
            callback(null, numberInput)
          }
        }
      })
    }
    showForm()
  }

  static threeOptionsAlert ({ title = 'Input', html = '', preConfirm, preDeny, position = 'center', onBeforeOpen, showDenyButton = true, showCancelButton = true, confirmButtonText = 'Confirm', confirmButtonColor = '#4BB543', denyButtonText = 'Deny', denyButtonColor = '#3085D6', cancelButtonText = 'Cancel', allowOutsideClick = true, allowEscapeKey = true, callback, denyCallback, cancelCallback, customClass, willOpen }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        html: html,
        focusConfirm: false,
        preConfirm: preConfirm,
        preDeny: preDeny,
        position: position,
        allowOutsideClick,
        allowEscapeKey,
        customClass: customClass,
        showDenyButton: showDenyButton,
        showCancelButton: showCancelButton,
        confirmButtonText: confirmButtonText,
        confirmButtonColor: confirmButtonColor,
        denyButtonText: denyButtonText,
        denyButtonColor: denyButtonColor,
        cancelButtonText: cancelButtonText,
        willOpen: willOpen
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        } else if (result.isDenied) {
          if (_.isFunction(callback)) {
            denyCallback(null, result.value)
          }
        } else {
          if (_.isFunction(cancelCallback)) {
            cancelCallback(null)
          }
        }
      })
    }
  }

  static tryToLoadSwal () {
    if (_.isNull(swal)) {
      try {
        swal = require('sweetalert2')
      } catch (e) {
        swal = null
      }
    }
  }
}

module.exports = Alerts
