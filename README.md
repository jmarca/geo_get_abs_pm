# Get Absolute Post Mile

Caltrans typically uses CA_PM, which is a postmile based on the
mileage on the facility within the county.  This module uses OSM line
layers to figure out the approximate absolute postmile, that is, the
postmile from the southern or western edge of the roadway in question,
regardless of which county it is in.

For freeways that start and end in a single county, this ends up being
about the same as the ca_pm.  It might actually be different due to
rounding errors, etc.

For longer facilities, it will be different for sure from any known
absolute postmile because the line layer being used to calculate the
length of the facility is the OpenStreetMap lines.  These are unlikely
to be identical to the official Caltrans postmiles, although they are
close.
