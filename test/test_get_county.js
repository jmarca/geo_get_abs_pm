/* global require console process describe it */

var should = require('should')

var _ = require('lodash')
var async = require('async')

var env = process.env;
var user = env.PSQL_USER
var pass = env.PSQL_PASS
var host = env.PSQL_HOST || 'localhost'
var port = env.PSQL_PORT || 5432

var get_county = require('../lib/get_county_from_point')

var getter = get_county({'username':user
                        ,'password':pass
                        ,'host':host
                        ,'port':port})

describe('get abs postmiles',function(){

    it('should get wim 1 in SJV'
      ,function(done){
           var wim = {'properties':{
               "2009-02-25": {
                   "loc": "LODI",
                   "wim_type": "Data/SHRP/LTPP",
                   "cal_pm": "43.7",
                   "cal_pm_numeric": 43.7,
                   "latitude": 38.175,
                   "longitude": -121.4,
                   "freeway": 5,
                   "geojson": {
                       "type": "Point",
                       "crs": {
                           "type": "name",
                           "properties": {
                               "name": "EPSG:4326"
                           }
                       },
                       "coordinates": [
                   -121.4,
                           38.175
                       ]
                   },
                   "lanes": 2
               }
           }}
           var key = "2009-02-25"
           // open file, pass to doc_get_dy
           getter(wim.properties[key]
                 ,function(e,result){
                      should.exist(result)
                      result.should.eql('077')
                      return done()
                  })
           return null

       })
    it('should get wim 111 in OC'
      ,function(done){
           var wim = {'properties':{
               "2009-02-25": {
                   "freeway": 405,
                   "longitude": -118.01,
                   "geojson": {
                       "crs": {
                           "type": "name",
                           "properties": {
                               "name": "EPSG:4326"
                           }
                       },
                       "coordinates": [
                   -118.01,
                           33.753
                       ],
                       "type": "Point"
                   },
                   "latitude": 33.753,
                   "cal_pm_numeric": 18.6,
                   "wim_type": "Data",
                   "loc": "SAIGON SB",
                   "cal_pm": "18.6",
                   "lanes": 4
               }
           }}
           var key = "2009-02-25"
           // open file, pass to doc_get_dy
           getter(wim.properties[key]
                 ,function(e,result){
                      should.exist(result)
                      result.should.eql('059')
                      return done()
                  })
           return null

       })

})
