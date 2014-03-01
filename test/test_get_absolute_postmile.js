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


describe('get abs from ca postmile',function(){
    var getter = get_abs_pm.ca_postmile_to_abs_postmile({'username':user
                                                        ,'password':pass
                                                        ,'host':host
                                                        ,'port':port})

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
describe('get abs from wim and nearby vds',function(){
    var getter = get_abs_pm.abs_postmile_based_on_vds_abs_pm({'username':user
                                                             ,'password':pass
                                                             ,'host':host
                                                             ,'port':port})

    it('should get wim 111'
      ,function(done){
           // open file, pass to doc_get_dy
           getter({'wim_id':'111',
                   'county':'059'}
                 ,function(e,result){
                      should.not.exist(e)
                      should.exist(result)
                      result.should.have.keys('abs_pm','geojson')
                      result.abs_pm.should.eql(18.3130708648652)
                      return done()
                  })
           return null

       })
    it('should get wim 103'
      ,function(done){
           // open file, pass to doc_get_dy
           getter({'wim_id':'103',
                   'county':'059'}
                 ,function(e,result){
                      should.not.exist(e)
                      should.exist(result)
                      result.should.have.keys('abs_pm','geojson')
                      result.abs_pm.should.eql(10.2648148143616)
                      return done()
                  })
           return null

       })
    it('should get wim wim.103.N'
      ,function(done){
           // open file, pass to doc_get_dy
           getter({'wim_id':'wim.103.N',
                   'county':'059'}
                 ,function(e,result){
                      should.not.exist(e)
                      should.exist(result)
                      result.should.have.keys('abs_pm','geojson')
                      result.abs_pm.should.eql(10.2648148143616)
                      return done()
                  })
           return null

       })

})
