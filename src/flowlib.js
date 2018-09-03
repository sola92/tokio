//@flow
/* eslint no-unused-vars: 0 no-undef: 0 */

/*
* Anything type declared here will be defined globally. Will also need to update
* "globals" config in package.json to whitelist the type from eslint no-undef
* errors.
*/
declare type EthAddress = string;
declare type Json = { [string]: any };
