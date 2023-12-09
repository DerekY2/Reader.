$(function(){
  // Display estimated storage used
  function bytesToSize(bytes) {
     var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
     if (bytes == 0) return '0 Byte';
     var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
     return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(({usage, quota}) => {
      storage_info = `You are using ${bytesToSize(usage)} out of ${bytesToSize(quota)} of your local storage`
      //$("#cr-storage-info").html(storage_info);
    });
  }
});
