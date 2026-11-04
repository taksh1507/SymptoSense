Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$source=Join-Path $PWD 'SymptoSense AIH Miniproject report .docx'
$target=Join-Path $PWD 'SymptoSense AIH Miniproject report with evaluation.docx'
Copy-Item -LiteralPath $source -Destination $target -Force
$zip=[IO.Compression.ZipFile]::Open($target,'Update')
function Read-Part($name){$reader=[IO.StreamReader]::new($zip.GetEntry($name).Open());try{$reader.ReadToEnd()}finally{$reader.Dispose()}}
function Write-Part($name,$value){$old=$zip.GetEntry($name);if($old){$old.Delete()};$entry=$zip.CreateEntry($name);$writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false));try{$writer.Write($value)}finally{$writer.Dispose()}}
[xml]$doc=Read-Part 'word/document.xml'
[xml]$rels=Read-Part 'word/_rels/document.xml.rels'
[xml]$types=Read-Part '[Content_Types].xml'
$ns=[Xml.XmlNamespaceManager]::new($doc.NameTable)
$w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$ns.AddNamespace('w',$w)
$anchor=$doc.SelectNodes('//w:body/w:p',$ns)|Where-Object{($_.SelectNodes('.//w:t',$ns).InnerText -join '') -match '^Chapter 6'}|Select-Object -First 1
if(!$anchor){throw 'Chapter 6 anchor missing'}
$figures=@(
 @('landing','Application home page','The home page introduces the symptom assessment service and provides access to the assessment workflow.'),
 @('dashboard','Patient dashboard','The authenticated dashboard provides access to assessments, saved reports, and account features.'),
 @('assessment','Assessment input','The assessment begins with patient context before collecting symptoms and adaptive questionnaire answers.'),
 @('reports','Saved assessment reports','The reports page lists assessments saved to the signed-in account. An empty account displays its initial state.'),
 @('ml-report','ML report and training','ML Insights presents the recorded training report and research evaluation controls for the disease classifier.'),
 @('evaluation','ML report evaluation','The Evaluation tab compares clean synthetic inputs with realistic input perturbations. It presents recorded accuracy, macro F1, top three accuracy, and top five accuracy for the benchmark; these results do not establish clinical diagnostic accuracy.'),
 @('learning-curve','Learning curve','Training and validation macro F1 are plotted against training sample size. This curve describes the recorded dataset evaluation, rather than clinical diagnostic validation.'),
 @('calibration','Confidence calibration','The line graph compares predicted confidence with observed correctness before and after calibration on the recorded evaluation data.'),
 @('model-health','Model Health monitoring','Model Health displays live confidence-service availability, latency, follow-ups, and retraining status. This legacy confidence service is separate from the disease classifier.')
)
$i=0
foreach($fig in $figures){
 $i++;$path=Join-Path $PWD ('outputs/report-images/'+$fig[0]+'.png');if(!(Test-Path $path)){throw "Missing $path"}
 $image=[Drawing.Image]::FromFile($path);$cx=5486400;$cy=[long]($cx*$image.Height/$image.Width);$image.Dispose()
 $id='rIdReportImage'+$i
 $rel=$rels.CreateElement('Relationship',$rels.DocumentElement.NamespaceURI);$rel.SetAttribute('Id',$id);$rel.SetAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');$rel.SetAttribute('Target',"media/report-$i.png");[void]$rels.DocumentElement.AppendChild($rel)
 [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$path,"word/media/report-$i.png")
 $title=[Security.SecurityElement]::Escape(('Figure 5.'+$i+' '+$fig[1]));$text=[Security.SecurityElement]::Escape($fig[2])
 $xml=@"
<root xmlns:w="$w" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:p><w:pPr><w:pageBreakBefore/><w:keepNext/><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>$title</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/><w:spacing w:after="160"/></w:pPr><w:r><w:drawing><wp:inline><wp:extent cx="$cx" cy="$cy"/><wp:docPr id="$(900+$i)" name="Report figure $i" descr="$title"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="report-$i.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="$id"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
<w:p><w:pPr><w:spacing w:after="160"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>$text</w:t></w:r></w:p>
</root>
"@
 [xml]$fragment=$xml
 foreach($node in @($fragment.DocumentElement.ChildNodes)){[void]$anchor.ParentNode.InsertBefore($doc.ImportNode($node,$true),$anchor)}
}
if(!$types.DocumentElement.SelectSingleNode("*[local-name()='Default' and @Extension='png']")){$type=$types.CreateElement('Default',$types.DocumentElement.NamespaceURI);$type.SetAttribute('Extension','png');$type.SetAttribute('ContentType','image/png');[void]$types.DocumentElement.AppendChild($type)}
Write-Part 'word/document.xml' $doc.OuterXml
Write-Part 'word/_rels/document.xml.rels' $rels.OuterXml
Write-Part '[Content_Types].xml' $types.OuterXml
$zip.Dispose()
Write-Output $target

