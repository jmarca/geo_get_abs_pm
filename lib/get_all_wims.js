
var viewer = require('couchdb_get_views')


function get_wims(cb){
    // get the wims from couchdb
    var query = {include_docs:true
                ,db:'vdsdata%2ftracker'
                ,startkey:'wim'
                ,endkey:'wimz'
                }
    // does that query work?
    viewer(query,cb)
    return null
}

module.exports = get_wims