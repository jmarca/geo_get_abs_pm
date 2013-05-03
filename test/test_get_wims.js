/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var async = require('async')

var get_wims = require('../lib/get_all_wims')

describe('get wim sites',function(){

    it('should get all wim sites, with data'
      ,function(done){
           // open file, pass to doc_get_dy
           get_wims(
               function(e,result){
                   should.exist(result)
                   result.should.have.property('length',218)
                   console.log(result.length)
                   _.each(result
                         ,function(row){
                              row.should.have.property('properties')
                              _.each(row.properties
                                    ,function(property){
                                         property.should.have.property('cal_pm_numeric')
                                     })
                          })
                   return done()
               })
           return null
       })
})
