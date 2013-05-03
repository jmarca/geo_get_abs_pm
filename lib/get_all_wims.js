
var viewer = require('couchdb_get_views')
var _ = require('lodash')

function get_wims(opts,cb){
    if(cb===undefined){
        cb = opts
        opts = {}
    }
    // get the wims from couchdb
    var query = {include_docs:true
                ,db:'vdsdata%2ftracking'
                ,startkey:'wim'
                ,endkey:'wimz'
                }
    if(opts.limit !== undefined) query.limit=opts.limit
    // does that query work?
    viewer(query,function(e,res){
        if(e) return cb(e)
        var result = []
        _.each(res.rows
              ,function(r){
                   if(r.doc !== undefined){
                       if(r.doc.properties !== undefined){
                           // is there a valid one?
                           _.some(r.doc.properties
                                 ,function(p){
                                      if(p.cal_pm_numeric !== undefined){
                                          result.push(_.clone(r.doc))
                                          return true
                                      }
                                      return false
                                  })
                       }
                   }
               });
        return cb(null,result)
    })
    return null
}

module.exports = get_wims