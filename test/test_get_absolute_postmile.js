/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var async = require('async')

var env = process.env;
var user = env.PSQL_USER
var pass = env.PSQL_PASS
var host = env.PSQL_HOST || 'localhost'
var port = env.PSQL_PORT || 5432

var get_abs_pm = require('../lib/get_absolute_post_mile')

var getter = get_abs_pm({'username':user
                        ,'password':pass
                        ,'host':host
                        ,'port':port})

describe('get abs postmiles',function(){

    it('should get wim 111'
      ,function(done){
           // open file, pass to doc_get_dy
           getter({'route':405
                  ,'ca_pm':18.6
                  ,'county':'059'}
                 ,function(e,result){
                      should.exist(result)
                      result.should.eql(18.534221613105)
                      return done()
                  })
           return null

       })

})
