/**
 * use postgis and knowledge of freeway line layer to compute absolute
 * postmile for WIM stations.
 *
 *
 */

// strategy, pre-parallelizing:
// get WIM station
// place on correct freeway
// compute postmile from county line, and from start of freeway
// (review HPMS code to see how I did that there)
//
// I expect that WIM postmile (county) will be off from that computed
// via postgis freeway length.  So adjust absolute postmile?
//
// I could find nearest VDS on link, but there might not be such a thing
//
// The problem is possibly flipping the order of VDS
//
// What I could also do is just use MRB, pre and post detectors, plus
// distance, to figure out the absolute post mile
//
// So.  for those WIM sites that have a pre or post VDS site, use Pre
// or Post site, plus length of segment from WIM site to VDS site, to
// determine the postmile of WIM site.
//
// For those WIM sites without a pre or post VDS site, use county
// postmile plus length of roadway from start to county line.
//