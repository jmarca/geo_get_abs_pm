
WITH
    cnty as (select st_transform(st_buffer(st_transform(the_geom,32611),1),4326)
             as the_geom
             from county c
             where statefp = $4
                   and countyfp = $3),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from tempseg.numbered_route_lines nrl
             where nrl.refnum=$1
                   and nrl.refnum::text = nrl.netref
                   and nrl.direction in (\'north\',\'east\',\'both\')
             ),
    snip(refnum,direction,snipgeom)
         as (select hg.refnum,hg.direction
                    ,((ST_Intersection(cnty.the_geom,hg.routeline))) as snipgeom
             from cnty,hwy_geom hg
         ),
    sniplinelen(refnum,direction,geom,len)
         as (select refnum,direction,snipgeom as geom,
             st_length(st_transform(snipgeom,32611)) as len
             from snip),
    measure_snip (refnum,direction,pt)
         as (select sll.refnum,sll.direction,st_line_interpolate_point(sll.geom,($2*(1000/0.621371)/sll.len)) as pt from sniplinelen as sll),
    measure_a as (select refnum, direction,
                  st_line_locate_point(hg.routeline,pt) as meas
                  from hwy_geom as hg join measure_snip using(refnum,direction) ),
    len_a as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_a as m join hwy_geom h using(refnum,direction))
    select len from len_a

PL/pgSQL function osm.ca_pm_abs_pm(numeric,numeric,character varying,text)

select osm.ca_pm_abs_pm(86,16,'065');


WITH
    cnty as (select st_transform(st_buffer(st_transform(the_geom,32611),1),4326)
             as the_geom
             from county c
             where statefp = '06'
                   and countyfp = '059'),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from tempseg.numbered_route_lines nrl
             where nrl.refnum=57
                   and nrl.refnum::text = nrl.netref
                   and nrl.direction in ('north','east','both')
             ),
    snip(refnum,direction,snipgeom)
         as (select hg.refnum,hg.direction
                    ,((ST_Intersection(cnty.the_geom,hg.routeline))) as snipgeom
             from cnty,hwy_geom hg
         ),
    sniplinelen(refnum,direction,geom,len)
         as (select refnum,direction,snipgeom as geom,
             st_length(st_transform(snipgeom,32611)) as len
             from snip),
    measure_snip (refnum,direction,pt)
         as (select sll.refnum,sll.direction,st_line_interpolate_point(sll.geom,(21*(1000/0.621371)/sll.len)) as pt from sniplinelen as sll),
    measure_a as (select refnum, direction,
                  st_line_locate_point(hg.routeline,pt) as meas
                  from hwy_geom as hg join measure_snip using(refnum,direction) ),
    len_a as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_a as m join hwy_geom h using(refnum,direction))
select refnum,direction,len,st_asewkt(geom) from sniplinelen

    select len from len_a



-- -------------

select ST_asewkt (geom), wim_id from wim_points_4326 join geom_points_4326 using (gid) where wim_id=101;

SRID=4326;POINT(-117.124682377 32.8509435284) |    101
SRID=4326;POINT(-117.880168447 33.9273493477) |    103

WITH
    wimdetector (pt)
         as (select ST_GeomFromEWKT('SRID=4326;POINT(-117.880168447 33.9273493477)')),
    vdsdetector (abs_pm,pt)
         as (select 10.426,ST_GeomFromEWKT('SRID=4326;POINT(-117.879881 33.929701)')),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from tempseg.numbered_route_lines nrl
             where nrl.refnum=57
                   and nrl.refnum::text = nrl.netref
                   and nrl.direction in ('north','east','both')
             ),
    measure_w as (select refnum, direction,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg ,wimdetector d ),
    measure_v as (select refnum, direction,abs_pm,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg, vdsdetector d ),
    len_w as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_w as m join hwy_geom h using(refnum,direction)),
    len_v as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_v as m join hwy_geom h using(refnum,direction))
    select abs_pm, len_w.len, len_v.len, abs_pm +(len_w.len - len_v.len) as wim_abs_pm from len_w,len_v;



-- okay, try from the closest vds point
spatialvds=# select ST_asewkt (geom), vds_id, abs_pm from vds_points_4326 join geom_points_4326 using (gid) join vds on (vds_id=vds.id) where vds_id=1202464;
               st_asewkt                | vds_id  | abs_pm
----------------------------------------+---------+--------
 SRID=4326;POINT(-117.879881 33.929701) | 1202464 | 10.426


-- parameterize that
-- $1 = freeway number
-- $2 = ewkt for wim
-- $3 = ewkt for vds
-- $4 = abs_pm for vds

WITH
    wimdetector (pt)
         as (select ST_GeomFromEWKT($2),
    vdsdetector (abs_pm,pt)
         as (select $4,ST_GeomFromEWKT($3)),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from tempseg.numbered_route_lines nrl
             where nrl.refnum=$1
                   and nrl.refnum::text = nrl.netref
                   and nrl.direction in ('north','east','both')
             ),
    measure_w as (select refnum, direction,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg ,wimdetector d ),
    measure_v as (select refnum, direction,abs_pm,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg, vdsdetector d ),
    len_w as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_w as m join hwy_geom h using(refnum,direction)),
    len_v as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_v as m join hwy_geom h using(refnum,direction))
    select abs_pm +(len_w.len - len_v.len) as wim_abs_pm from len_w,len_v;




-- nearest neighbor code

with
cnty as (
    select cf.name,
        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)
        as the_geom
    from carb_counties_aligned_03 cc
    join counties_fips cf on (lower(cf.name)=lower(cc.name))
    where fips='06059'
),
wim_info as (
    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom
    from wim_stations w
    join wim_points_4326 wp on(w.site_no =wp.wim_id)
    join geom_points_4326 using (gid)
    join wim_freeway wf on(wf.wim_id=w.site_no)
    where site_no=103
),
vds_info as (
    select vds.vds_id,vds.abs_pm as vds_abs_pm,geom as vds_geom,w.*,st_distance(geom,w.wim_geom) as dist
    from vds_geoview_full vds
    join cnty on (st_contains(cnty.the_geom,vds.geom))
    join wim_info w on (vds.freeway_id = w.wim_freeway)
    where vds.abs_pm is not null
    order by dist
    limit 1
)
select tempseg.wim_abs_pm(wim_freeway,
                          st_asewkt(wim_geom),
                          st_asewkt(vds_geom),
                          vds_abs_pm)
from vds_info;



-- for a failing wim site, use the other
-- nearest neighbor code

with
cnty as (
    select cf.name,
        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)
        as the_geom
    from carb_counties_aligned_03 cc
    join counties_fips cf on (lower(cf.name)=lower(cc.name))
    where fips='06007'
),
wim_info as (
    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom
    from wim_stations w
    join wim_points_4326 wp on(w.site_no =wp.wim_id)
    join geom_points_4326 using (gid)
    join wim_freeway wf on(wf.wim_id=w.site_no)
    where site_no=107
)
select * from wim_info;

select tempseg.wim_abs_pm(wim_freeway,
                          st_asewkt(wim_geom))
from wim_info;


with
cnty as (
    select cf.name,
        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)
        as the_geom
    from carb_counties_aligned_03 cc
    join counties_fips cf on (lower(cf.name)=lower(cc.name))
    where fips='06007'
),
wim_info as (
    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom
    from wim_stations w
    join wim_points_4326 wp on(w.site_no =wp.wim_id)
    join geom_points_4326 using (gid)
    join wim_freeway wf on(wf.wim_id=w.site_no)
    where site_no=107
),
wimdetector (pt)
    as (select ST_GeomFromEWKT(wim_geom)
        from wim_info),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from wim_info
             join tempseg.numbered_route_lines nrl on (wim_info.wim_freeway=nrl.refnum)
             where nrl.refnum::text = nrl.netref
                   and nrl.direction in ('north','east','both')
             ),
    measure_w as (select refnum, direction,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg ,wimdetector d ),
    len_w as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_w as m join hwy_geom h using(refnum,direction))
    select len from len_w


-- stupid multilines are a pain.

WITH
cnty as (
    select cf.name,
        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)
        as the_geom
    from carb_counties_aligned_03 cc
    join counties_fips cf on (lower(cf.name)=lower(cc.name))
    where fips='06073'
),
wim_info as (
    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom
    from wim_stations w
    join wim_points_4326 wp on(w.site_no =wp.wim_id)
    join geom_points_4326 using (gid)
    join wim_freeway wf on(wf.wim_id=w.site_no)
    where site_no=14
),
vds_info as (
    select vds.vds_id,vds.abs_pm as vds_abs_pm,geom as vds_geom,w.*,st_distance(geom,w.wim_geom) as dist
    from vds_geoview_full vds
    join cnty on (st_contains(cnty.the_geom,vds.geom))
    join wim_info w on (vds.freeway_id = w.wim_freeway)
    where vds.abs_pm is not null
    order by dist
    limit 1
),
    wimdetector (pt)
         as (select ST_GeomFromEWKT(wim_geom) from wim_info),
    vdsdetector (abs_pm,pt)
         as (select vds_abs_pm,ST_GeomFromEWKT(vds_geom) from vds_info),
    diffsq
         as (select ST_envelope(ST_MakeLine(v.pt,w.pt)) as box
             from wimdetector w ,vdsdetector v
         ),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,ST_LineMerge(nrl.routeline)
             from wim_info join tempseg.numbered_route_lines nrl on (wim_info.wim_freeway=nrl.refnum)
             where nrl.refnum::text = nrl.netref
                   and nrl.direction in ('north','east','both')
             ),
    shg as (select st_intersection(box,routeline) as snipline
          from diffsq,hwy_geom
)
select st_asewkt(snipline) from shg;

),
    measure_w as (select refnum, direction,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from snip_hwy_geom as hg ,wimdetector d ),
    measure_v as (select refnum, direction,abs_pm,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from snip_hwy_geom as hg, vdsdetector d ),
    len_w as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_w as m join hwy_geom h using(refnum,direction)),
    len_v as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_v as m join hwy_geom h using(refnum,direction))
    select abs_pm +(len_w.len - len_v.len) as wim_abs_pm from len_w,len_v
