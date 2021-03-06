/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var async = require('async')

var fix_wims = require('../lib/fix_wim').fix_wims

describe('get wim sites',function(){

    it('should get all wim sites, fix them'
      ,function(done){
           // open file, pass to doc_get_dy
           fix_wims({limit:20}
                   ,function(e,result){
                   should.exist(result)
                   result.should.have.property('length',19)
                   _.each(result
                         ,function(row){
                              row.should.have.property('properties')
                              console.log(row._id)
                              console.log(row.properties)
                              _.each(row.properties
                                    ,function(property){
                                         property.should.have.property('cal_pm_numeric')
                                         property.should.have.property('county')
                                         if( property.abs_pm === undefined ){
                                             var toolong = property.toolong
                                             var multiline = property.multiline
                                             var test = multiline || toolong
                                             test.should.be.ok
                                         }
                                     })
                          })
                   return done()
               })
           return null
       })
})
