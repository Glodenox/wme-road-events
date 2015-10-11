<?php
	/**
	* In addition to this file, the HTTP header Access-Control-Allow-Origin must be set as well. My hosting didn't allow for changing this header through PHP, but this .htaccess file worked fine:
	*	<IfModule mod_headers.c>
			Header set Access-Control-Allow-Origin "*"
		</IfModule>
	*/

	$bbox = $_REQUEST['bbox'];
	$id = (int)$_REQUEST['id'];
	if ($bbox == null && $id == null) {
		die('No arguments specified');
	}
	if ($bbox !== null) {
		if (preg_match("/^\d+\.\d+,\d+\.\d+\|\d+\.\d+,\d+\.\d+$/", $bbox) === 1) {
			$curlopt_url = 'http://gipod.api.agiv.be/ws/v1/workassignment?bbox='.$bbox;
		} else {
			die('Invalid bounding box');
		}
	} else {
		if ($id === 0) {
			die('No valid arguments specified');
		}
		$curlopt_url = 'http://gipod.api.agiv.be/ws/v1/workassignment/'.$id;
	}

	$h = curl_init();
	curl_setopt_array($h, array(
	CURLOPT_URL => $curlopt_url,
	CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:42.0) Gecko/20100101 Firefox/42.0'));
	curl_exec($h);
	curl_close($h);
?>