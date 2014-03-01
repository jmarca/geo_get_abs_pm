/* global require console */

var env = process.env;
var cdb = env.OCUCHDB_TRACKING_DB || 'vdsdata%2ftracking'
var fix_wims = require('./fix_wim').fix_wims
var make_bulkdoc_saver = require('couchdb_bulkdoc_saver')

var async = require('async')
var _ = require('lodash')

var argv = require('optimist')
.usage('Wherever possible, insert the absolute postmile into WIM records that only have CA post mile (which is relative to the county line).  \nUsage: $0')
.alias('l', 'limit')
.describe('l', 'Limit the db query to only this many WIM stations.  Useful during testing.')
           .boolean('s')
           .alias('s', 'save')
           .describe('s', 'Whether to save the results.  Defaults to false, useful during testing.')
 .argv
;

var limit = argv.limit
var saveit = argv.save

console.log(limit)
console.log(saveit)

async.nextTick(function(){
    fix_wims({limit:limit}
        ,function(e,r){
             console.log('all done, check for error')
             if(e) throw new Error(e)
             console.log('all done')
             //console.log(r)
             //throw new Error('croak')
             // if save save result, otherwise, just dump to output
             if(!saveit){
                 console.log('not going to save')
                 //console.log(r)
                 return null
             }else{
                 console.log('going to save')
                 //throw new Error('fu')

                 var saver = make_bulkdoc_saver(cdb)
                 saver({'docs':r}
                      ,function(e,res){
                           if(e){
                               console.log('failed to save')
                               console.log(r)
                               throw new Error(e)
                           }
                           console.log('save done')
                           _.each(res,function(r){
                               if(r.ok === undefined){
                                   console.log('save issue:' + JSON.stringify(r))
                               }
                           });
                           return null
                       });
                 return null
             }
         });
})
1;
