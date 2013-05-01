-- DROP TYPE IF EXISTS hwy_seg CASCADE;
-- CREATE TYPE hwy_seg AS (
--        refnum numeric,
--        direction text,
--        len_km double precision,
--        seg_geom  geometry
-- );

WITH
    cnty as (select st_transform(st_buffer(st_transform(the_geom,32611),1),4326)
             as the_geom
             from county c
             where statefp = '06'
                   and countyfp = '065'),
    hwy_geom(refnum,direction,routeline)
         as (select nrl.refnum,nrl.direction,nrl.routeline
             from tempseg.numbered_route_lines nrl
             where nrl.refnum=10
                   and nrl.refnum::text = nrl.netref
                   and nrl.direction in (
'north',
-- 'south',
'east',
--'west',
'both'
                       )
    ),
    snip(refnum,direction,snipgeom)
         as (select hg.refnum,hg.direction
                    ,((ST_Intersection(cnty.the_geom,hg.routeline))) as snipgeom
             from cnty,hwy_geom hg
         ),
    sniplinelen(refnum,direction,geom,len) as (select refnum,direction,snipgeom as geom,st_length(st_transform(snipgeom,32611)) as len
                     from snip),
    wim_site(site_no,ca_pm) as (select 5, 59.4),

    measure_snip (site_no,refnum,direction,pt)
         as (select ws.site_no,sll.refnum,sll.direction,st_line_interpolate_point(sll.geom,(ws.ca_pm*(1000/0.621371)/sll.len)) as pt from sniplinelen as sll,wim_site as ws),

    measure_a as (select site_no,refnum, direction, st_line_locate_point(hg.routeline,pt) as meas from hwy_geom as hg join measure_snip using(refnum,direction) ),
    len_a as (select m.*,st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000)  as len
              from measure_a as m join hwy_geom h using(refnum,direction))

select * from len_a


select a.site_no, a.refnum, a.direction, a.meas as a_meas, b.meas as b_meas from measure_a a join measure_b b using(site_no, refnum, direction)



    linelen(refnum,direction,geom,len) as (select refnum,direction,routeline as geom,st_length(st_transform(routeline,32611))/1000 as len
                     from hwy_geom),
    st_line_locate_point()


    seg as (select refnum,direction,st_linemerge(ST_Line_SubString(geom, $2 , $3 ) ) as seg_geom
       from linelen ),
    snipseg as (select refnum,direction,st_linemerge(ST_Line_SubString(geom, $2 , $3 ) ) as seg_geom
       from sniplinelen )

;
    select refnum,direction,st_length(st_transform(seg_geom,32611))/1000 as len,seg_geom
          from seg
';
  RETURN QUERY EXECUTE var_sql USING highway,start_km,end_km,in_county,in_statefp;
  RETURN;
END;
$BODY$
  LANGUAGE 'plpgsql' IMMUTABLE STRICT;

ALTER FUNCTION osm.highway_section(highway numeric,start_km numeric,end_km numeric,in_county varchar, in_state text)
OWNER TO postgres;
