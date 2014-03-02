CREATE OR REPLACE FUNCTION tempseg.wim_abs_pm(IN highway integer, IN wim_ewkt text, IN vds_ewkt text, IN vds_abs_pm double precision)
returns numeric
as
$BODY$
DECLARE
    var_sql text := '';
    ret numeric;
BEGIN
    IF highway = 0 OR highway is null  THEN
        -- not enough to give a result just return
        RAISE NOTICE 'need highway number to do this';
        return null;
    END IF;
    IF wim_ewkt is null THEN
        -- die
        RAISE NOTICE 'need the wim geometry as ewkt to do anything useful';
        return null;
    END IF;
    IF vds_ewkt is null THEN
        -- die
        RAISE NOTICE 'need the vds geometry as ewkt to do anything useful';
        return null;
    END IF;
    IF vds_abs_pm = 0 OR vds_abs_pm is null THEN
        -- die
        RAISE NOTICE 'need the vds site abs postmile to do anything useful';
        return null;
    END IF;
var_sql := '
WITH
    wimdetector (pt)
         as (select ST_GeomFromEWKT($2)),
    vdsdetector (abs_pm,pt)
         as (select $4,ST_GeomFromEWKT($3)),
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
    select abs_pm +(len_w.len - len_v.len) as wim_abs_pm from len_w,len_v
';
  EXECUTE var_sql  INTO ret  USING highway,wim_ewkt,vds_ewkt,vds_abs_pm;
  RETURN ret;
END;
$BODY$
  LANGUAGE 'plpgsql' IMMUTABLE STRICT;

ALTER FUNCTION tempseg.wim_abs_pm(IN highway integer, IN wim_ewkt text, IN vds_ewkt text, IN vds_abs_pm double precision)
OWNER TO postgres;


-- now ditto, but without the vds, just dead reconing

CREATE OR REPLACE FUNCTION tempseg.wim_abs_pm(IN highway integer, IN wim_ewkt text)
returns numeric
as
$BODY$
DECLARE
    var_sql text := '';
    ret numeric;
BEGIN
    IF highway = 0 OR highway is null  THEN
        -- not enough to give a result just return
        RAISE NOTICE 'need highway number to do this';
        return null;
    END IF;
    IF wim_ewkt is null THEN
        -- die
        RAISE NOTICE 'need the wim geometry as ewkt to do anything useful';
        return null;
    END IF;
var_sql := '
WITH
    wimdetector (pt)
         as (select ST_GeomFromEWKT($2)),
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
    measure_w as (select refnum, direction,
                  st_line_locate_point(hg.routeline,d.pt) as meas
                  from hwy_geom as hg ,wimdetector d ),
    len_w as (select m.*,
              st_length(st_transform(st_line_substring(h.routeline,0,m.meas),32611))*(0.621371/1000) as len
              from measure_w as m join hwy_geom h using(refnum,direction))
    select len from len_w
';
  EXECUTE var_sql  INTO ret  USING highway,wim_ewkt;
  RETURN ret;
END;
$BODY$
  LANGUAGE 'plpgsql' IMMUTABLE STRICT;

ALTER FUNCTION tempseg.wim_abs_pm(IN highway integer, IN wim_ewkt text)
OWNER TO postgres;
