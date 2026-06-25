using System.Windows;

namespace MarkdownMidget;

/// <summary>A small two-field modal prompt (e.g. link text + URL).</summary>
public partial class InputDialog : Window
{
    public InputDialog(string title, string label1, string value1, string label2, string value2)
    {
        InitializeComponent();
        Title = title;
        Label1.Text = label1;
        Field1.Text = value1;
        Label2.Text = label2;
        Field2.Text = value2;
        Loaded += (_, _) =>
        {
            var focusFirst = string.IsNullOrEmpty(value1);
            var box = focusFirst ? Field1 : Field2;
            box.Focus();
            box.SelectAll();
        };
    }

    public string Value1 => Field1.Text;
    public string Value2 => Field2.Text;

    private void Ok_Click(object sender, RoutedEventArgs e)
    {
        DialogResult = true;
    }
}
