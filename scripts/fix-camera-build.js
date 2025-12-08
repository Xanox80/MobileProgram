const fs = require('fs');
const path = require('path');

function fixBuildGradle(filePath, packageName) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove jcenter() lines - various patterns
    content = content.replace(/\s*jcenter\(\)\s*\n/g, '\n');
    content = content.replace(/,\s*jcenter\(\)/g, '');
    content = content.replace(/jcenter\(\)\s*,/g, '');
    content = content.replace(/jcenter\(\)/g, '');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${packageName} build.gradle (removed jcenter)`);
      return true;
    } else {
      console.log(`ℹ️  ${packageName} build.gradle already fixed`);
      return false;
    }
  } else {
    console.log(`⚠️  ${packageName} build.gradle not found`);
    return false;
  }
}

// Fix react-native-camera
const cameraPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-camera',
  'android',
  'build.gradle'
);
fixBuildGradle(cameraPath, 'react-native-camera');

// Fix react-native-push-notification
const pushNotificationPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-push-notification',
  'android',
  'build.gradle'
);
fixBuildGradle(pushNotificationPath, 'react-native-push-notification');

// Fix react-native-push-notification to use AndroidX
if (fs.existsSync(pushNotificationPath)) {
  let content = fs.readFileSync(pushNotificationPath, 'utf8');
  
  // Replace old support library logic with AndroidX (keep Firebase for compilation)
  if (content.includes('supportLibMajorVersion')) {
    content = content.replace(
      /dependencies \{\s*\/\/ Use either AndroidX library names.*?implementation "com\.google\.firebase:firebase-messaging:.*?"\s*\}/s,
      `dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    testImplementation 'junit:junit:4.12'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.facebook.react:react-native:+'
    implementation 'me.leolin:ShortcutBadger:1.1.22@aar'
    // Firebase is needed for compilation, but won't be initialized if requestPermissions is false
    implementation "com.google.firebase:firebase-messaging:\${safeExtGet('firebaseMessagingVersion', '21.1.0')}"
}`
    );
    
    fs.writeFileSync(pushNotificationPath, content, 'utf8');
    console.log('✅ Fixed react-native-push-notification to use AndroidX');
  }
}

