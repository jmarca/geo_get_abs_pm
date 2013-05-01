-- DROP TYPE IF EXISTS hwy_seg CASCADE;
-- CREATE TYPE hwy_seg AS (
--        refnum numeric,
--        direction text,
--        len_km double precision,
--        seg_geom  geometry
-- );

CREATE OR REPLACE FUNCTION osm.ca_pm_abs_pm(IN highway numeric, IN ca_pm numeric, IN in_county varchar, IN in_state text DEFAULT 'CA')
returns numeric
as
$BODY$
DECLARE
    var_sql text := '';
    ret numeric;
    in_statefp varchar(2) ;
BEGIN
    IF highway = 0 OR highway is null  THEN
        -- not enough to give a result just return
        RAISE NOTICE 'need highway number to do this';
        return null;
    END IF;
    IF ca_pm is null THEN
        -- die
        RAISE NOTICE 'need a post mile to do anything useful';
        return null;
    END IF;
    IF COALESCE(in_county,'') = '' THEN
        -- not enough to give a result just return
        RAISE NOTICE 'need a county fips code to compute absolute postmile';
        return null;
    END IF;
    in_statefp := statefp FROM state_lookup As s WHERE s.abbrev = upper(in_state);
var_sql := '
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
                   and nrl.direction in ('
                       || quote_literal('north')
                       ||','|| quote_literal('east')
                       ||','|| quote_literal('both')
                       ||')
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
';
  EXECUTE var_sql  INTO ret  USING highway,ca_pm,in_county,in_statefp;
  RETURN ret;
END;
$BODY$
  LANGUAGE 'plpgsql' IMMUTABLE STRICT;

ALTER FUNCTION osm.ca_pm_abs_pm(IN highway numeric, IN ca_pm numeric, IN in_county varchar, IN in_state text)
OWNER TO postgres;
