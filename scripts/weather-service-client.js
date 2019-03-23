
var url = 'https://weather-ydn-yql.media.yahoo.com/forecastrss';
var method = 'GET';
var app_id = 'RhI0nO72';
var consumer_key = 'dj0yJmk9UEh4Unl4dU1ockNnJnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTM1';
var consumer_secret = '9757b4ed144efa9189b28807b98fb889e5d310a7';
var concat = '&';

function getOAuthHeader(key) {

  var query = { 'woeid': key, 'format': 'json' };
  var oauth = {
    'oauth_consumer_key': consumer_key,
    'oauth_nonce': Math.random().toString(36).substring(2),
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': parseInt(new Date().getTime() / 1000).toString(),
    'oauth_version': '1.0'
  };

  var merged = {};
  $.extend(merged, query, oauth);
  // Note the sorting here is required
  var merged_arr = Object.keys(merged).sort().map(function (k) {
    return [k + '=' + encodeURIComponent(merged[k])];
  });
  var signature_base_str = method
    + concat + encodeURIComponent(url)
    + concat + encodeURIComponent(merged_arr.join(concat));

  var composite_key = encodeURIComponent(consumer_secret) + concat;
  var hash = CryptoJS.HmacSHA1(signature_base_str, composite_key);
  var signature = hash.toString(CryptoJS.enc.Base64);

  oauth['oauth_signature'] = signature;
  var auth_header = 'OAuth ' + Object.keys(oauth).map(function (k) {
    return [k + '="' + oauth[k] + '"'];
  }).join(',');

  var headers = {
    AuthHeader: auth_header,
    AppId: app_id
  };

  return headers;
}

var weatherServiceAuth =
{
  getOAuthHeader: getOAuthHeader
};